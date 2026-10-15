import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import { config } from "./config";

export let pool: mysql.Pool;

/** สร้าง database + ตาราง (ถ้ายังไม่มี) และใส่ลูกค้าตัวอย่างถ้าตารางว่าง */
export async function initDb() {
  const { database, ...conn } = config.db;
  const boot = await mysql.createConnection(conn);
  await boot.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4`);
  await boot.end();

  pool = mysql.createPool({
    ...config.db,
    waitForConnections: true,
    connectionLimit: 10,
    decimalNumbers: true, // DECIMAL → number
    charset: "utf8mb4",
  });

  // อ่าน schema.sql (ตัดบรรทัด CREATE DATABASE / USE ออก เพราะสร้างไว้แล้ว)
  // (หาไฟล์ทั้งตอนรันด้วย ts-node-dev และตอนรันจาก dist/)
  const schemaPath = [path.join(__dirname, "sql", "schema.sql"), path.join(__dirname, "..", "sql", "schema.sql")].find(
    (f) => fs.existsSync(f),
  )!;
  const sql = fs
    .readFileSync(schemaPath, "utf8")
    .split("\n")
    .filter((l) => !/^\s*(CREATE DATABASE|USE |--)/i.test(l))
    .join("\n");
  for (const stmt of sql.split(";").map((s) => s.trim()).filter(Boolean)) {
    await pool.query(stmt);
  }

  const [rows] = await pool.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS n FROM customers");
  if (Number(rows[0]?.n) === 0) await seedCustomers();
}

// ลูกค้าตัวอย่าง 30 คน กระจายในรัศมี ~3 กม. จากร้าน (ให้ทดสอบจัดเส้นทางได้ทันที)
async function seedCustomers() {
  const first = ["สมชาย", "สมหญิง", "วิชัย", "นภา", "ประเสริฐ", "กนก", "อนุชา", "พิมพ์", "ธนา", "มาลี",
    "สุดา", "ปรีชา", "ศิริพร", "อดิศักดิ์", "วรรณา", "ชาติชาย", "รัตนา", "ณัฐพล", "ขวัญ", "บุญเรือน",
    "อารีย์", "สุรชัย", "เพ็ญศรี", "ธีระ", "กัญญา", "พิชัย", "ลดา", "อนันต์", "ฟ้า", "จันทร์"];
  const last = ["ใจดี", "รักเรียน", "มั่นคง", "สดใส", "ทองดี", "แสงทอง", "ศรีสุข", "บุญมา", "วงศ์ใหญ่", "พรมมา"];
  let s = 2026;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const values = first.map((f, i) => {
    const a = rnd() * Math.PI * 2;
    const km = Math.sqrt(rnd()) * 3;
    const lat = config.shop.lat + (km * Math.sin(a)) / 111;
    const lng = config.shop.lng + (km * Math.cos(a)) / (111 * Math.cos((config.shop.lat * Math.PI) / 180));
    const phone = "08" + String(Math.floor(rnd() * 1e8)).padStart(8, "0");
    return [`${f} ${last[i % last.length]}`, phone, +lat.toFixed(6), +lng.toFixed(6)];
  });
  await pool.query("INSERT INTO customers (name, phone, latitude, longitude) VALUES ?", [values]);
}
