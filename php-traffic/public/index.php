<?php
require_once __DIR__ . '/../config/database.php';
spl_autoload_register(function ($class) {
    if (file_exists(__DIR__ . '/../app/Controllers/' . $class . '.php')) {
        require_once __DIR__ . '/../app/Controllers/' . $class . '.php';
    }
});

header('Content-Type: application/json');
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($path === '/api/traffic/status' && $method === 'GET') {
    echo (new TrafficController($pdo))->getStatus();
} else {
    http_response_code(404);
    echo json_encode(["error" => "Endpoint tidak ditemukan"]);
}