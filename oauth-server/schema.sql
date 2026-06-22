-- schema.sql

CREATE DATABASE IF NOT EXISTS smart_crowd_auth;
USE smart_crowd_auth;

-- Tabel untuk Data Pengguna (Citizen Login)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL -- Hash menggunakan bcrypt
);

-- Tabel untuk OAuth Clients (Microservices lain atau aplikasi frontend)
CREATE TABLE IF NOT EXISTS oauth_clients (
    client_id VARCHAR(50) PRIMARY KEY,
    client_secret VARCHAR(255) NOT NULL,
    grant_types VARCHAR(100) NOT NULL -- Contoh: 'password,client_credentials,refresh_token'
);

-- Tabel untuk menyimpan Token yang diterbitkan
CREATE TABLE IF NOT EXISTS oauth_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token TEXT NOT NULL,
    type ENUM('access', 'refresh') NOT NULL,
    client_id VARCHAR(50) NOT NULL,
    user_id INT NULL, -- NULL jika menggunakan client_credentials
    expires_at DATETIME NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (client_id) REFERENCES oauth_clients(client_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- --- SEED DATA UNTUK TESTING ---
-- Password untuk user ini adalah: password123 (sudah di-hash dengan bcrypt)
INSERT INTO users (username, password) VALUES 
('Hendry', '$2b$10$sTnYxUJiFZEr4o9HeBjp/u1OMWIPXVfSAVSjEY7DV/xxoC940TS9q'),
('Rafi', '$2b$10$sTnYxUJiFZEr4o9HeBjp/u1OMWIPXVfSAVSjEY7DV/xxoC940TS9q');

-- Mendaftarkan client aplikasi (misalnya API Gateway atau Frontend)
INSERT INTO oauth_clients (client_id, client_secret, grant_types) VALUES 
('smart_crowd_app', 'secret_key_123', 'password,client_credentials,refresh_token'),
('backend_service', 'service_secret', 'client_credentials');