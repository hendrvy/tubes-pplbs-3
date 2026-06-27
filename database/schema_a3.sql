-- Smart Crowd Control — Database Schema A3
-- Jalankan: mysql -u root -p < database/schema_a3.sql

CREATE DATABASE IF NOT EXISTS smart_city_db;
USE smart_city_db;

-- Zones (shared)
CREATE TABLE IF NOT EXISTS zones (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  district   VARCHAR(100),
  area_m2    FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crowd readings (php-citizen)
CREATE TABLE IF NOT EXISTS crowd_readings (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  zone_id       INT NOT NULL,
  density_count INT NOT NULL DEFAULT 0,
  risk_level    ENUM('Aman','Waspada','Bahaya','Kritis') DEFAULT 'Aman',
  source        VARCHAR(50) DEFAULT 'manual',
  recorded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_zone (zone_id),
  INDEX idx_recorded (recorded_at)
);

-- Reports (php-citizen)
CREATE TABLE IF NOT EXISTS reports (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  zone_id     INT NOT NULL DEFAULT 0,
  description TEXT,
  status      ENUM('open','in_progress','resolved') DEFAULT 'open',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_zone (zone_id),
  INDEX idx_status (status)
);

-- Notifications (php-citizen)
CREATE TABLE IF NOT EXISTS notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(255),
  body       TEXT,
  is_read    TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Incidents (incident-service)
CREATE TABLE IF NOT EXISTS incidents (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  zone_id     INT NOT NULL DEFAULT 0,
  type        VARCHAR(100),
  severity    ENUM('low','medium','high','critical') DEFAULT 'medium',
  description TEXT,
  status      ENUM('active','resolved') DEFAULT 'active',
  reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  INDEX idx_zone (zone_id),
  INDEX idx_status (status)
);

-- Alerts (incident-service)
CREATE TABLE IF NOT EXISTS alerts (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  zone_id    INT,
  alert_type VARCHAR(100),
  severity   VARCHAR(50),
  message    TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed data: 5 zona
INSERT IGNORE INTO zones (id, name, district, area_m2) VALUES
(1, 'Zone 1', 'Pusat Kota', 5000),
(2, 'Zone 2', 'Pasar Utama', 3000),
(3, 'Zone 3', 'Stasiun', 2000),
(4, 'Zone 4', 'Alun-alun', 8000),
(5, 'Zone 5', 'Mall', 4000);

-- Seed crowd readings
INSERT INTO crowd_readings (zone_id, density_count, risk_level, source) VALUES
(1, 25, 'Aman', 'wokwi_esp32'),
(2, 85, 'Kritis', 'wokwi_esp32'),
(3, 45, 'Waspada', 'wokwi_esp32'),
(4, 10, 'Aman', 'manual'),
(5, 60, 'Bahaya', 'wokwi_esp32');

-- Seed reports
INSERT INTO reports (zone_id, description, status) VALUES
(2, 'Kerumunan sangat padat di pintu masuk pasar', 'open'),
(3, 'Antrian panjang di stasiun saat jam pulang', 'in_progress'),
(1, 'Area pusat kota kondusif', 'resolved');

-- Seed incidents
INSERT INTO incidents (zone_id, type, severity, description, status) VALUES
(2, 'crowd_surge', 'high', 'Kerumunan tiba-tiba meningkat drastis di zona pasar', 'active'),
(3, 'crowd_surge', 'medium', 'Penumpukan penumpang di zona stasiun', 'active');
