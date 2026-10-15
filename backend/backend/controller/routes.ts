import { Request, Response } from "express";
import { RowDataPacket } from "mysql2";
import { pool } from "../db";
import { buildPlan, Item } from "../services/routing";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
function newCode(used: Set<string>): string {
  let c = "";
  do {
    c = "J" + Array.from({ length: 4 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
  } while (used.has(c));
  used.add(c);
  return c;
}

// POST /api/routes/plan   body: { attempt?: number }
// จัดเส้นทางจากออเดอร์ PENDING ทั้งหมด → สร้างใบงาน+เลขใบงานต่อไรเดอร์ลง DB
// (กด "คำนวณใหม่" = เรียกซ้ำด้วย attempt เพิ่มขึ้น: ใบงานของแผนก่อนหน้าจะถูกแทนที่)
export async function planRoutes(req: Request, res: Response) {
  const attempt = Math.max(1, Math.floor(Number(req.body?.attempt) || 1));

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT o.order_id, o.quantity AS boxes, c.name AS customer, c.phone, c.latitude AS lat, c.longitude AS lng
     FROM orders o JOIN customers c ON c.customer_id = o.customer_id
     WHERE o.status = 'PENDING' ORDER BY o.order_id`,
  );
  if (rows.length === 0) {
    return res.status(400).json({ success: false, message: "ยังไม่มีออเดอร์ให้จัดเส้นทาง" });
  }
  const items: Item[] = rows.map((r) => ({
    order_id: r.order_id, customer: r.customer, phone: r.phone, boxes: r.boxes, lat: r.lat, lng: r.lng,
  }));

  const plan = buildPlan(items, attempt);
  const used = new Set<string>();
  const routes = plan.routes.map((r) => ({ job_code: newCode(used), ...r }));

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("DELETE FROM jobs"); // job_stops ลบตาม CASCADE
    for (const r of routes) {
      await conn.query(
        `INSERT INTO jobs (job_code, plan_no, rider, total_boxes, total_distance_km, total_time_min, rider_cost)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [r.job_code, attempt, r.rider, r.total_boxes, r.total_distance_km, r.total_time_min, r.cost],
      );
      const values = r.stops.map((s) => [
        r.job_code, s.sequence, s.order_id, s.customer, s.phone, s.boxes, s.lat, s.lng, s.arrive_min, s.late ? 1 : 0,
      ]);
      await conn.query(
        `INSERT INTO job_stops (job_code, sequence, order_id, customer, phone, boxes, lat, lng, arrive_min, late)
         VALUES ?`,
        [values],
      );
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  res.json({
    success: true,
    message: `จัดเส้นทางสำเร็จ ${routes.length} ไรเดอร์ (แผนครั้งที่ ${attempt})`,
    data: { ...plan, routes },
  });
}
