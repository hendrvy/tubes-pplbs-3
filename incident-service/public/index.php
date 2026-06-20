<?php
require_once __DIR__ . '/../config/database.php';

// Autoload Controller secara otomatis
spl_autoload_register(function ($class) {
    $path = __DIR__ . '/../app/Controllers/' . $class . '.php';
    if (file_exists($path)) {
        require_once $path;
    }
});

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$input = json_decode(file_get_contents('php://input'), true);

// --- MASUKKAN KODE ANDA DI SINI ---
if ($path === '/api/incidents' && $method === 'POST') {
    echo (new IncidentController($pdo))->create($input);
} elseif ($path === '/api/incidents' && $method === 'GET') {
    echo (new IncidentController($pdo))->listActive();
} elseif ($path === '/api/notifications' && $method === 'GET') {
    echo (new AlertController($pdo))->index();
} else {
    http_response_code(404);
    echo json_encode(["error" => "Endpoint tidak ditemukan di Incident Service"]);
}