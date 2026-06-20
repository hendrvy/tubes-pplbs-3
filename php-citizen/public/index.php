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

// Routing
if ($path === '/api/crowd/readings' && $method === 'POST') {
    echo (new CrowdController($pdo))->submitReading($input);
} 
elseif ($path === '/api/crowd/current' && $method === 'GET') {
    echo (new CrowdController($pdo))->getCurrent();
} 
elseif ($path === '/api/reports' && $method === 'POST') {
    echo (new ReportController($pdo))->submit($input);
} 
elseif ($path === '/api/reports' && $method === 'GET') {
    echo (new ReportController($pdo))->list($_GET);
} 
elseif (preg_match('/\/api\/reports\/(\d+)\/status/', $path, $m) && $method === 'PATCH') {
    echo (new ReportController($pdo))->updateStatus($m[1], $input);
} 
else {
    http_response_code(404);
    echo json_encode(["error" => "Endpoint tidak ditemukan"]);
}