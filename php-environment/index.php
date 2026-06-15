<?php
header('Content-Type: application/json');

$db_host = getenv('DB_HOST') ?: 'mysql';
$db_name = getenv('DB_NAME') ?: 'environment_db';
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

if ($path === '/air-quality' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $stmt = $pdo->prepare("INSERT INTO air_quality (sensor_id, location, aqi, pm25, pm10, co2, measured_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");
    $stmt->execute([
        $data['sensor_id'] ?? null,
        $data['location'] ?? 'unknown',
        $data['aqi'] ?? 0,
        $data['pm25'] ?? 0,
        $data['pm10'] ?? 0,
        $data['co2'] ?? 0
    ]);
    
    $aqi = $data['aqi'] ?? 0;
    $is_extreme = $aqi > 300;
    
    echo json_encode([
        'message' => 'Air quality data saved',
        'id' => $pdo->lastInsertId(),
        'alert' => $is_extreme ? 'EXTREME AQI LEVEL DETECTED' : null
    ]);
    
} elseif ($path === '/air-quality' && $method === 'GET') {
    $limit = $_GET['limit'] ?? 100;
    $stmt = $pdo->prepare("SELECT * FROM air_quality ORDER BY measured_at DESC LIMIT ?");
    $stmt->execute([intval($limit)]);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    
} elseif ($path === '/weather' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $stmt = $pdo->prepare("INSERT INTO weather (location, temperature, humidity, pressure, rainfall, recorded_at) VALUES (?, ?, ?, ?, ?, NOW())");
    $stmt->execute([
        $data['location'] ?? 'unknown',
        $data['temperature'] ?? 0,
        $data['humidity'] ?? 0,
        $data['pressure'] ?? 0,
        $data['rainfall'] ?? 0
    ]);
    
    echo json_encode(['message' => 'Weather data saved']);
    
} elseif ($path === '/weather' && $method === 'GET') {
    $limit = $_GET['limit'] ?? 100;
    $stmt = $pdo->prepare("SELECT * FROM weather ORDER BY recorded_at DESC LIMIT ?");
    $stmt->execute([intval($limit)]);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    
} elseif ($path === '/flood-risks' && $method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM flood_risks ORDER BY risk_level DESC");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Endpoint not found']);
}
?>