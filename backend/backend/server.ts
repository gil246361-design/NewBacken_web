import http from "http";
import { app } from "./app";
import { config } from "./config";
import { initDb } from "./db";

initDb()
  .then(() => {
    http.createServer(app).listen(config.port, () => {
      console.log(`Server is started on port ${config.port}`);
    });
  })
  .catch((e) => {
    console.error("เชื่อมต่อ/สร้างฐานข้อมูลไม่สำเร็จ ตรวจสอบ DB_HOST/DB_USER/DB_PASSWORD:", e);
    process.exit(1);
  });
