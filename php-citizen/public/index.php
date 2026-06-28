<?php
require_once __DIR__ . '/../config/database.php';

spl_autoload_register(function ($class) {
    $path = __DIR__ . '/../app/Controllers/' . $class . '.php';
    if (file_exists($path)) require_once $path;
});

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$path   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
/*echo json_encode([
    "uri" => $_SERVER['REQUEST_URI'],
    "path" => $path
]);
exit;*/
$input  = json_decode(file_get_contents('php://input'), true) ?? [];

// ── Health check — dipakai A1 Gateway ────────────────────────
if ($path === '/health' && $method === 'GET') {
    try {
        $pdo->query('SELECT 1');
        echo json_encode([
            'status'  => 'ok',
            'service' => 'php-citizen',
            'db'      => 'connected',
            'timestamp' => date('c'),
        ]);
    } catch (Exception $e) {
        http_response_code(503);
        echo json_encode(['status' => 'error', 'db' => 'disconnected']);
    }

// ── Crowd readings ────────────────────────────────────────────
} elseif ($path === '/api/crowd/readings' && $method === 'POST') {
    echo (new CrowdController($pdo))->submitReading($input);

} elseif ($path === '/api/crowd/current' && $method === 'GET') {
    echo (new CrowdController($pdo))->getCurrent();

// ── Reports ───────────────────────────────────────────────────
} elseif ($path === '/api/reports' && $method === 'POST') {
    echo (new ReportController($pdo))->submit($input);

} elseif ($path === '/api/reports' && $method === 'GET') {
    echo (new ReportController($pdo))->list($_GET);

} elseif (preg_match('/\/api\/reports\/(\d+)\/status/', $path, $m) && $method === 'PATCH') {
    echo (new ReportController($pdo))->updateStatus($m[1], $input);

// ── Notifications ─────────────────────────────────────────────
} elseif ($path === '/api/notifications' && $method === 'GET') {
    echo (new NotifController($pdo))->index();

// ── 404 ───────────────────────────────────────────────────────
} else {
    http_response_code(404);
    echo json_encode([
        'status'  => 'error',
        'code'    => 404,
        'message' => 'Endpoint tidak ditemukan',
        'service' => 'php-citizen',
    ]);
}