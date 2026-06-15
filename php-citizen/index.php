<?php
header('Content-Type: application/json');

$db_host = getenv('DB_HOST') ?: 'mysql';
$db_name = getenv('DB_NAME') ?: 'citizen_db';
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

if ($path === '/reports' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['title']) || !isset($data['description'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Title and description required']);
        exit;
    }
    
    $stmt = $pdo->prepare("INSERT INTO reports (title, description, location, citizen_email, status, created_at) VALUES (?, ?, ?, ?, 'pending', NOW())");
    $stmt->execute([
        $data['title'],
        $data['description'],
        $data['location'] ?? null,
        $data['citizen_email'] ?? null
    ]);
    
    echo json_encode(['message' => 'Report created', 'id' => $pdo->lastInsertId()]);
    
} elseif ($path === '/reports' && $method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM reports ORDER BY created_at DESC");
    $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($reports);
    
} elseif (preg_match('/\/reports\/(\d+)/', $path, $matches) && $method === 'GET') {
    $stmt = $pdo->prepare("SELECT * FROM reports WHERE id = ?");
    $stmt->execute([$matches[1]]);
    $report = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($report) {
        echo json_encode($report);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Report not found']);
    }
    
} elseif ($path === '/notifications' && $method === 'GET') {
    $email = $_GET['email'] ?? null;
    if ($email) {
        $stmt = $pdo->prepare("SELECT * FROM notifications WHERE citizen_email = ? ORDER BY created_at DESC LIMIT 50");
        $stmt->execute([$email]);
    } else {
        $stmt = $pdo->query("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50");
    }
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Endpoint not found']);
}
?>