-- สร้างอัตโนมัติตอนเริ่มเซิร์ฟเวอร์ (db.ts) ไฟล์นี้ไว้ให้ดู/รันเองได้
CREATE DATABASE IF NOT EXISTS rider_db CHARACTER SET utf8mb4;
USE rider_db;

CREATE TABLE IF NOT EXISTS customers (
  customer_id INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  phone       VARCHAR(20)  NOT NULL DEFAULT '',
  latitude    DECIMAL(9,6) NOT NULL,
  longitude   DECIMAL(9,6) NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  order_id    INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  quantity    INT NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  order_date  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS jobs (
  job_code          CHAR(5) PRIMARY KEY,
  plan_no           INT NOT NULL,
  rider             VARCHAR(50) NOT NULL,
  total_boxes       INT NOT NULL,
  total_distance_km DECIMAL(8,2) NOT NULL,
  total_time_min    INT NOT NULL,
  rider_cost        DECIMAL(10,2) NOT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_stops (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  job_code    CHAR(5) NOT NULL,
  sequence    INT NOT NULL,
  order_id    INT NULL,
  customer    VARCHAR(100) NOT NULL,
  phone       VARCHAR(20)  NOT NULL DEFAULT '',
  boxes       INT NOT NULL,
  lat         DECIMAL(9,6) NOT NULL,
  lng         DECIMAL(9,6) NOT NULL,
  arrive_min  INT NOT NULL,
  late        TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (job_code) REFERENCES jobs(job_code) ON DELETE CASCADE
);
