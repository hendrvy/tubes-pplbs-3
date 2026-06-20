<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../app/Controllers/CrowdController.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_URI'] === '/health') {
    echo json_encode(["status" => "Database Connected"]);
} else {
    $controller = new CrowdController($pdo);
    $controller->handleRequest($_SERVER['REQUEST_METHOD']);
}