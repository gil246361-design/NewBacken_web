# Rider Routing API (Express + TypeScript + MySQL)

## รันบนเครื่อง
```
npm install
npm run dev               # พัฒนา (รีสตาร์ทอัตโนมัติ)  หรือ  npm run build && npm start
```
ต้องมี MySQL (หรือ MariaDB) เปิดอยู่ ตั้งค่าผ่าน environment variable: `DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME`
(ค่าเริ่มต้น localhost / 3306 / root / ว่าง / rider_db) ดูตัวอย่างใน `.env.example`
เซิร์ฟเวอร์สร้างฐานข้อมูลและตารางให้เองตอนเริ่ม (ดู `sql/schema.sql`) และใส่ลูกค้าตัวอย่าง 30 คนถ้าตารางว่าง
เวลา deploy ต้องคัดลอกโฟลเดอร์ `sql/` ไปด้วย

พอร์ตเริ่มต้น 3000 (`PORT`) · พิกัดร้าน `SHOP_LAT`, `SHOP_LNG` (ค่าเริ่มต้น 16.2465, 103.2535)

## Endpoint (ตอบ `{ success, message?, data }`)
| Method | Path | หน้าที่ |
|---|---|---|
| GET | /api/customers | ลูกค้าทั้งหมด |
| GET | /api/customers/search?keyword= | ค้นจากส่วนหนึ่งของชื่อ/นามสกุล |
| GET | /api/customers/nearby-1km?lat=&lng= | ลูกค้าในระยะ 1 กม. |
| POST | /api/customers | เพิ่ม `{name, phone, latitude, longitude}` |
| PUT | /api/customers/:id | แก้ไข |
| DELETE | /api/customers/:id | ลบ (ออเดอร์ของลูกค้าถูกลบตาม) |
| GET | /api/orders | ออเดอร์ทั้งหมด (พร้อม customer) |
| POST | /api/orders | เพิ่ม `{customer_id, quantity}` (quantity 1–3) |
| PUT | /api/orders/:order_id | แก้จำนวนกล่อง `{quantity}` |
| DELETE | /api/orders/:order_id | ลบ |
| POST | /api/orders/seed | จำลองออเดอร์ 25–30 รายการ (ล้างของเดิม) |
| DELETE | /api/orders/clear | ล้างออเดอร์ทั้งหมด |
| GET | /api/orders/nearby-2km?lat=&lng= | ออเดอร์ในระยะ 2 กม. |
| POST | /api/routes/plan | จัดเส้นทาง body `{attempt}` (ครั้งแรก 1, กด "คำนวณใหม่" เพิ่มทีละ 1) |
| GET | /api/jobs | ใบงานล่าสุดทั้งหมด |
| GET | /api/jobs/:jobCode | ใบงานของไรเดอร์ (หน้าไรเดอร์ใช้) |

### POST /api/routes/plan
อ่านออเดอร์สถานะ PENDING ทั้งหมด → แบ่งไรเดอร์ (≤3 ออเดอร์/คน) → เรียงลำดับจุด → คำนวณกำไร/ต้นทุน/เวลา
→ สร้างเลขใบงาน (เช่น `J1A2B`) บันทึกลง `jobs`/`job_stops`
เรียกซ้ำ (คำนวณใหม่) จะ **แทนที่ใบงานของแผนก่อนหน้าทั้งหมด** และพยายามเสนอแผนที่ต่างจากเดิม

### GET /api/jobs/:jobCode
`data`: `job_code, rider, total_boxes, total_distance_km, total_time_min, fullRouteUrl, stops[{sequence, customer, phone, boxes, lat, lng, mapUrl}]`
ลิงก์ Google Maps ใช้ `travelmode=two-wheeler`

## กติกาธุรกิจ
แก้ที่ `config.ts` (`RULES`) ที่เดียว — ตอนนี้ตาม Project.pdf: ไรเดอร์ละ ≤3 ออเดอร์ · ออเดอร์ละ ≤3 กล่อง ·
ขาย 65 · ต้นทุน 40 · ค่าเรียก 15 บาท/ครั้ง · 2 บาท/กม./กล่อง · 30 กม./ชม. · ต้องถึงภายใน 60 นาที
