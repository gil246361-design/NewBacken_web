import { Request, Response } from "express";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { pool } from "../db";
import { RULES } from "../config";
import { distanceKm, parseLatLng } from "../services/geo";

// ดึงออเดอร์พร้อมข้อมูลลูกค้า (รูปแบบเดิม: ฟิลด์ออเดอร์ + customer: {...})
const SELECT = `
  SELECT o.order_id, o.customer_id, o.quantity, o.status, o.order_date,
         c.name AS c_name, c.phone AS c_phone, c.latitude AS c_lat, c.longitude AS c_lng
  FROM orders o JOIN customers c ON c.customer_id = o.customer_id`;

function shape(r: RowDataPacket) {
  return {
    order_id: r.order_id,
    customer_id: r.customer_id,
    quantity: r.quantity,
    status: r.status,
    order_date: r.order_date,
    customer: { customer_id: r.customer_id, name: r.c_name, phone: r.c_phone, latitude: r.c_lat, longitude: r.c_lng },
  };
}

async function getOne(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>(`${SELECT} WHERE o.order_id = ?`, [id]);
  return rows[0] ? shape(rows[0]) : null;
}

const validQty = (q: unknown) => Number.isInteger(q) && (q as number) >= 1 && (q as number) <= RULES.maxBoxesPerOrder;
const QTY_MSG = `quantity ต้องเป็นจำนวนเต็ม 1–${RULES.maxBoxesPerOrder}`;

// GET /api/orders
export async function listOrders(req: Request, res: Response) {
  const [rows] = await pool.query<RowDataPacket[]>(`${SELECT} ORDER BY o.order_id`);
  res.json({ success: true, data: rows.map(shape) });
}

// POST /api/orders/seed  จำลองออเดอร์ 25–30 รายการ (ล้างของเดิมก่อน)
export async function seedOrders(req: Request, res: Response) {
  const [custs] = await pool.query<RowDataPacket[]>("SELECT customer_id FROM customers ORDER BY customer_id");
  if (custs.length === 0) {
    return res.status(400).json({ success: false, message: "ไม่มีลูกค้า กรุณาเพิ่มลูกค้าก่อน" });
  }
  const total = Math.floor(Math.random() * 6) + 25;
  const ids = custs.map((c) => c.customer_id as number).sort(() => Math.random() - 0.5);
  const values = Array.from({ length: total }, (_, i) => [
    ids[i % ids.length],
    1 + Math.floor(Math.random() * RULES.maxBoxesPerOrder),
    "PENDING",
  ]);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("DELETE FROM orders");
    await conn.query("INSERT INTO orders (customer_id, quantity, status) VALUES ?", [values]);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  const [rows] = await pool.query<RowDataPacket[]>(`${SELECT} ORDER BY o.order_id`);
  res.json({ success: true, message: `จำลองออเดอร์สำเร็จ ${rows.length} รายการ`, data: rows.map(shape) });
}

// DELETE /api/orders/clear  (ต้องอยู่ก่อน /:order_id)
export async function clearOrders(req: Request, res: Response) {
  await pool.query("DELETE FROM orders");
  res.json({ success: true, message: "ล้างรายการสั่งซื้อทั้งหมดเรียบร้อยแล้ว" });
}

// GET /api/orders/nearby-2km?lat=..&lng=..
export async function nearbyOrders(req: Request, res: Response) {
  const p = parseLatLng(req);
  if (!p) return res.status(400).json({ success: false, message: "ต้องระบุ lat และ lng เป็นตัวเลข" });
  const [rows] = await pool.query<RowDataPacket[]>(`${SELECT} ORDER BY o.order_id`);
  const result = rows.map(shape).filter((o) => distanceKm(p.lat, p.lng, o.customer.latitude, o.customer.longitude) <= 2);
  res.json({ success: true, data: result });
}

// POST /api/orders
export async function createOrder(req: Request, res: Response) {
  const { customer_id, quantity } = req.body ?? {};
  const [c] = await pool.query<RowDataPacket[]>("SELECT customer_id FROM customers WHERE customer_id = ?", [customer_id]);
  if (!c[0]) return res.status(400).json({ success: false, message: "ไม่พบ customer_id นี้" });
  if (!validQty(quantity)) return res.status(400).json({ success: false, message: QTY_MSG });
  const [r] = await pool.query<ResultSetHeader>(
    "INSERT INTO orders (customer_id, quantity, status) VALUES (?, ?, 'PENDING')",
    [customer_id, quantity],
  );
  res.status(201).json({ success: true, message: "เพิ่มออเดอร์สำเร็จ", data: await getOne(r.insertId) });
}

// PUT /api/orders/:order_id  (แก้จำนวนกล่อง)
export async function updateOrder(req: Request, res: Response) {
  const id = Number(req.params.order_id);
  const { quantity } = req.body ?? {};
  if (!(await getOne(id))) return res.status(404).json({ success: false, message: "ไม่พบออเดอร์นี้" });
  if (!validQty(quantity)) return res.status(400).json({ success: false, message: QTY_MSG });
  await pool.query("UPDATE orders SET quantity = ? WHERE order_id = ?", [quantity, id]);
  res.json({ success: true, message: "อัปเดตจำนวนกล่องสำเร็จ", data: await getOne(id) });
}

// DELETE /api/orders/:order_id
export async function deleteOrder(req: Request, res: Response) {
  const [r] = await pool.query<ResultSetHeader>("DELETE FROM orders WHERE order_id = ?", [Number(req.params.order_id)]);
  if (r.affectedRows === 0) return res.status(404).json({ success: false, message: "ไม่พบออเดอร์นี้" });
  res.json({ success: true, message: "ลบออเดอร์สำเร็จ" });
}
