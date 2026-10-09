-- Vantage — database schema
-- Run once on a fresh MySQL server: mysql -u root -p < db/schema.sql

CREATE DATABASE IF NOT EXISTS sales_ledger_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sales_ledger_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  pin_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'viewer') NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  display_name VARCHAR(150) NOT NULL UNIQUE,
  sector VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS client_aliases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  alias_text VARCHAR(150) NOT NULL UNIQUE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  display_name VARCHAR(150) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_aliases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id INT NOT NULL,
  alias_text VARCHAR(150) NOT NULL UNIQUE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  service_id INT NOT NULL,
  amount_excl_vat DECIMAL(14,2) NOT NULL,
  amount_incl_vat DECIMAL(14,2) NOT NULL,
  commission_rate DECIMAL(4,2) NOT NULL DEFAULT 0.15,
  commission DECIMAL(14,2) NOT NULL,
  date_paid DATE NULL,
  invoice_number VARCHAR(50),
  sale_month CHAR(7) NOT NULL,
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (service_id) REFERENCES services(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_sale_month (sale_month),
  INDEX idx_date_paid (date_paid),
  INDEX idx_client (client_id),
  INDEX idx_service (service_id)
);

CREATE TABLE IF NOT EXISTS targets (
  target_key VARCHAR(50) PRIMARY KEY,
  target_value DECIMAL(14,2) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appraisals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  period_key VARCHAR(20) NOT NULL UNIQUE,
  period_label VARCHAR(50) NOT NULL,
  revenue_snapshot DECIMAL(14,2),
  deal_count_snapshot INT,
  target_snapshot DECIMAL(14,2),
  wins TEXT,
  challenges TEXT,
  focus TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS settings (
  setting_key VARCHAR(50) PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meetings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  meeting_type ENUM('Discovery Call', 'Follow-up', 'Contract Signing', 'Check-in', 'Other') NOT NULL DEFAULT 'Follow-up',
  meeting_date DATE NOT NULL,
  meeting_time TIME,
  status ENUM('Scheduled', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Scheduled',
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_meeting_date (meeting_date),
  INDEX idx_status (status)
);

-- Default KPI targets
INSERT IGNORE INTO targets (target_key, target_value) VALUES
  ('monthlyRevenue', 1000000),
  ('avgDealSize', 130000),
  ('newClientsPerMonth', 3),
  ('repeatRatePct', 40),
  ('crossSellDepth', 1.5);

-- Default company name (changeable from the app)
INSERT IGNORE INTO settings (setting_key, setting_value) VALUES
  ('company_name', 'Vantage');