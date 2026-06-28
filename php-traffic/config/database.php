<?php

$host = getenv('DB_HOST') ?: 'mysql';
$db   = getenv('DB_NAME') ?: 'smart_city_db';
$user = getenv('DB_USER') ?: 'root';
$pass = getenv('DB_PASSWORD') ?: 'password';

try {
    $dsn = "mysql:host={$host};dbname={$db};charset=utf8mb4";

    $pdo = new PDO(
        $dsn,
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);

    die(json_encode([
        "status" => "error",
        "message" => "Database Connection Failed",
        "detail" => $e->getMessage()
    ]));
}