import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import * as customers from "./controller/customers";
import * as orders from "./controller/orders";
import * as jobs from "./controller/jobs";
import * as routes from "./controller/routes";

export const app = express();
app.use(cors()); // ไม่เช่นนั้น Angular (คนละ origin) เรียกไม่ได้
app.use(express.json());

app.get("/", (req, res) => res.json({ success: true, message: "Rider routing API is running" }));

// ---------- 1. Customer ----------
app.get("/api/customers", customers.listCustomers);
app.get("/api/customers/search", customers.searchCustomers); // ?keyword=
app.get("/api/customers/nearby-1km", customers.nearbyCustomers); // ?lat=&lng=
app.post("/api/customers", customers.createCustomer);
app.put("/api/customers/:id", customers.updateCustomer);
app.delete("/api/customers/:id", customers.deleteCustomer);

// ---------- 2. Order (เส้นทางตายตัวต้องอยู่ก่อน /:order_id) ----------
app.post("/api/orders/seed", orders.seedOrders);
app.delete("/api/orders/clear", orders.clearOrders);
app.get("/api/orders/nearby-2km", orders.nearbyOrders); // ?lat=&lng=
app.get("/api/orders", orders.listOrders);
app.post("/api/orders", orders.createOrder);
app.put("/api/orders/:order_id", orders.updateOrder);
app.delete("/api/orders/:order_id", orders.deleteOrder);

// ---------- 3. จัดเส้นทาง + ใบงาน ----------
app.post("/api/routes/plan", routes.planRoutes);
app.get("/api/jobs", jobs.listJobs);
app.get("/api/jobs/:jobCode", jobs.getJob);

// ---------- error handler (Express 5 ส่ง error จาก async มาที่นี่เอง) ----------
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดบนเซิร์ฟเวอร์" });
});
