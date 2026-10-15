import { Request, Response } from "express";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { pool } from "../db";
import { distanceKm, parseLatLng } from "../services/geo";

const COLS = "customer_id, name, phone, latitude, longitude";

// GET /api/customers
export async function listCustomers(req: Request, res: Response) {
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT ${COLS} FROM customers ORDER BY customer_id`);
  res.json({ success: true, data: rows });
}

// GET /api/customers/search?keyword=สม  (ค้นจากส่วนหนึ่งของชื่อ/นามสกุล)
export async function searchCustomers(req: Request, res: Response) {
  const keyword = String(req.query.keyword ?? "").trim();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${COLS} FROM customers WHERE name LIKE ? ORDER BY customer_id`,
    [`%${keyword}%`],
  );
  res.json({ success: true, data: rows });
}

// GET /api/customers/nearby-1km?lat=..&lng=..
export async function nearbyCustomers(req: Request, res: Response) {
  const p = parseLatLng(req);
  if (!p) return res.status(400).json({ success: false, message: "ต้องระบุ lat และ lng เป็นตัวเลข" });
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT ${COLS} FROM customers`);
  const result = rows.filter((c) => distanceKm(p.lat, p.lng, c.latitude, c.longitude) <= 1);
  res.json({ success: true, data: result });
}

// POST /api/customers
export async function createCustomer(req: Request, res: Response) {
  const { name, phone, latitude, longitude } = req.body ?? {};
  if (!name || typeof latitude !== "number" || typeof longitude !== "number") {
    return res.status(400).json({ success: false, message: "ต้องมี name, latitude, longitude (ตัวเลข)" });
  }
  const [r] = await pool.query<ResultSetHeader>(
    "INSERT INTO customers (name, phone, latitude, longitude) VALUES (?, ?, ?, ?)",
    [name, phone ?? "", latitude, longitude],
  );
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT ${COLS} FROM customers WHERE customer_id = ?`, [r.insertId]);
  res.status(201).json({ success: true, message: "เพิ่มข้อมูลลูกค้าสำเร็จ", data: rows[0] });
}

// PUT /api/customers/:id
export async function updateCustomer(req: Request, res: Response) {
  const id = Number(req.params.id);
  const [found] = await pool.query<RowDataPacket[]>(`SELECT ${COLS} FROM customers WHERE customer_id = ?`, [id]);
  const c = found[0];
  if (!c) return res.status(404).json({ success: false, message: "ไม่พบลูกค้า" });
  const { name, phone, latitude, longitude } = req.body ?? {};
  const next = {
    name: name ?? c.name,
    phone: phone ?? c.phone,
    latitude: typeof latitude === "number" ? latitude : c.latitude,
    longitude: typeof longitude === "number" ? longitude : c.longitude,
  };
  await pool.query("UPDATE customers SET name=?, phone=?, latitude=?, longitude=? WHERE customer_id=?", [
    next.name, next.phone, next.latitude, next.longitude, id,
  ]);
  res.json({ success: true, message: "แก้ไขข้อมูลลูกค้าสำเร็จ", data: { customer_id: id, ...next } });
}

// DELETE /api/customers/:id  (ออเดอร์ของลูกค้าถูกลบตาม ON DELETE CASCADE)
export async function deleteCustomer(req: Request, res: Response) {
  const [r] = await pool.query<ResultSetHeader>("DELETE FROM customers WHERE customer_id = ?", [Number(req.params.id)]);
  if (r.affectedRows === 0) return res.status(404).json({ success: false, message: "ไม่พบลูกค้า" });
  res.json({ success: true, message: "ลบลูกค้าสำเร็จ" });
}
