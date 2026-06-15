<?php
header('Content-Type: application/json');

$db_host = getenv('DB_HOST') ?: 'mysql';
$db_name = getenv('DB_NAME') ?: 'traffic_db';
$db_user = getenv('DB_USER') ?: 'root';
$db_pass = getenv('DB_PASSWORD') ?: 'password';

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name", $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($path === '/traffic-data' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $stmt = $pdo->prepare("INSERT INTO traffic_data (sensor_id, location, vehicle_count, average_speed, congestion_level, recorded_at) VALUES (?, ?, ?, ?, ?, NOW())");
    $stmt->execute([
        $data['sensor_id'] ?? null,
        $data['location'] ?? 'unknown',
        $data['vehicle_count'] ?? 0,
        $data['average_speed'] ?? 0,
        $data['congestion_level'] ?? 0
    ]);
    
    echo json_encode(['message' => 'Traffic data saved', 'id' => $pdo->lastInsertId()]);
    
} elseif ($path === '/traffic-data' && $method === 'GET') {
    $limit = $_GET['limit'] ?? 100;
    $stmt = $pdo->prepare("SELECT * FROM traffic_data ORDER BY recorded_at DESC LIMIT ?");
    $stmt->execute([intval($limit)]);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    
} elseif ($path === '/incidents' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $stmt = $pdo->prepare("INSERT INTO incidents (type, location, description, severity, reported_at, status) VALUES (?, ?, ?, ?, NOW(), 'active')");
    $stmt->execute([
        $data['type'] ?? 'unknown',
        $data['location'] ?? 'unknown',
        $data['description'] ?? '',
        $data['severity'] ?? 'medium'
    ]);
    
    echo json_encode(['message' => 'Incident reported', 'id' => $pdo->lastInsertId()]);
    
} elseif ($path === '/incidents' && $method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM incidents WHERE status = 'active' ORDER BY reported_at DESC");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Endpoint not found']);
}
?>