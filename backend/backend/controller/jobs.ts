import { Request, Response } from "express";
import { RowDataPacket } from "mysql2";
import { pool } from "../db";
import { config } from "../config";

// ลิงก์ Google Maps — travelmode ต้องเป็น two-wheeler (มอเตอร์ไซค์)
const MODE = "two-wheeler";
const ll = (lat: number, lng: number) => `${lat},${lng}`;
const gmaps = (params: Record<string, string>) =>
  "https://www.google.com/maps/dir/?" +
  new URLSearchParams({ api: "1", ...params, travelmode: MODE }).toString();

function jobData(job: RowDataPacket, stops: RowDataPacket[]) {
  const last = stops[stops.length - 1];
  const fullRouteUrl = last
    ? gmaps({
        origin: ll(config.shop.lat, config.shop.lng),
        destination: ll(last.lat, last.lng),
        ...(stops.length > 1 ? { waypoints: stops.slice(0, -1).map((s) => ll(s.lat, s.lng)).join("|") } : {}),
      })
    : "";
  return {
    job_code: job.job_code,
    rider: job.rider,
    total_boxes: job.total_boxes,
    total_distance_km: job.total_distance_km,
    total_time_min: job.total_time_min,
    fullRouteUrl,
    stops: stops.map((s) => ({
      sequence: s.sequence,
      customer: s.customer,
      phone: s.phone,
      boxes: s.boxes,
      lat: s.lat,
      lng: s.lng,
      mapUrl: gmaps({ destination: ll(s.lat, s.lng) }),
    })),
  };
}

// GET /api/jobs/:jobCode  — ไรเดอร์ใช้เปิดใบงานด้วยเลขใบงาน
export async function getJob(req: Request, res: Response) {
  const code = String(req.params.jobCode ?? "").trim().toUpperCase();
  const [jobs] = await pool.query<RowDataPacket[]>("SELECT * FROM jobs WHERE job_code = ?", [code]);
  if (!jobs[0]) return res.status(404).json({ success: false, message: "ไม่พบเลขใบงานนี้" });
  const [stops] = await pool.query<RowDataPacket[]>("SELECT * FROM job_stops WHERE job_code = ? ORDER BY sequence", [code]);
  res.json({ success: true, message: "พบใบงาน", data: jobData(jobs[0], stops) });
}

// GET /api/jobs  — รายการใบงานล่าสุดทั้งหมด (เจ้าของร้านใช้ดู/คัดลอกเลขใบงาน)
export async function listJobs(req: Request, res: Response) {
  const [jobs] = await pool.query<RowDataPacket[]>("SELECT * FROM jobs ORDER BY rider");
  const [stops] = await pool.query<RowDataPacket[]>("SELECT * FROM job_stops ORDER BY job_code, sequence");
  const data = jobs.map((j) => jobData(j, stops.filter((s) => s.job_code === j.job_code)));
  res.json({ success: true, data });
}
