<?php
$host = 'localhost';
$db   = 'smart_city_db'; // Nama database Anda
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die(json_encode(["error" => "Database Connection Failed: " . $e->getMessage()]));
}