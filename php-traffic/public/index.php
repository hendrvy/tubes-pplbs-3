<?php

file_put_contents('/tmp/test.log', date('c') . " REQUEST: " . ($_SERVER['REQUEST_URI'] ?? 'CLI') . PHP_EOL, FILE_APPEND);

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../config/database.php';

spl_autoload_register(function ($class) {
    $path = __DIR__ . '/../app/Controllers/' . $class . '.php';
    if (file_exists($path)) require_once $path;
});

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$path   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$input  = json_decode(file_get_contents('php://input'), true) ?? [];

// ── Health check ──────────────────────────────────────────────
if ($path === '/health' && $method === 'GET') {
    try {
        $pdo->query('SELECT 1');
        echo json_encode([
            'status'  => 'ok',
            'service' => 'incident-service',
            'db'      => 'connected',
            'timestamp' => date('c'),
        ]);
    } catch (Exception $e) {
        http_response_code(503);
        echo json_encode(['status' => 'error', 'db' => 'disconnected']);
    }

// ── Incidents ─────────────────────────────────────────────────
} elseif ($path === '/api/incidents' && $method === 'POST') {
    echo (new IncidentController($pdo))->create($input);

} elseif ($path === '/api/incidents' && $method === 'GET') {
    echo (new IncidentController($pdo))->listActive();

} elseif (preg_match('/\/api\/incidents\/(\d+)\/resolve/', $path, $m) && $method === 'PATCH') {
    echo (new IncidentController($pdo))->resolve($m[1], $input);

// ── Alerts / Notifications ────────────────────────────────────
} elseif ($path === '/api/notifications' && $method === 'GET') {
    echo (new AlertController($pdo))->index();

// ── Zones ─────────────────────────────────────────────────────
} elseif ($path === '/api/zones' && $method === 'GET') {
    echo (new ZoneController($pdo))->index();

// ── 404 ───────────────────────────────────────────────────────
} else {
    http_response_code(404);
    echo json_encode([
        'status'  => 'error',
        'code'    => 404,
        'message' => 'Endpoint tidak ditemukan di Incident Service',
        'service' => 'incident-service',
    ]);
}