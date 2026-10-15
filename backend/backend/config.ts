// ค่าตั้งต้นทั้งหมดอ่านจาก environment variable (มีค่า default สำหรับเครื่องตัวเอง)
const env = process.env;

export const config = {
  port: Number(env.PORT ?? 3000),
  db: {
    host: env.DB_HOST ?? "localhost",
    port: Number(env.DB_PORT ?? 3306),
    user: env.DB_USER ?? "root",
    password: env.DB_PASSWORD ?? "",
    database: env.DB_NAME ?? "rider_db",
  },
  shop: { lat: Number(env.SHOP_LAT ?? 16.2465), lng: Number(env.SHOP_LNG ?? 103.2535) },
};

// กติกาตาม Project.pdf (ยังรอตกลงกับอาจารย์ว่ายึดฉบับไหน — แก้ที่นี่ที่เดียว)
export const RULES = {
  maxOrdersPerRider: 3, // ไรเดอร์รับไม่เกิน 3 ออเดอร์
  maxBoxesPerOrder: 3, // ออเดอร์ละไม่เกิน 3 กล่อง
  pricePerBox: 65,
  costPerBox: 40,
  riderFeePerTrip: 15, // ค่าเรียกไรเดอร์ต่อครั้ง
  feePerKmPerBox: 2, // บาท/กม./กล่อง
  speedKmh: 30,
  deadlineMin: 60, // ออก 11:30 ต้องถึงก่อน 12:30
};
