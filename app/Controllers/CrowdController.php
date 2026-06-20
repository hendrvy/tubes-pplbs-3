<?php
require_once __DIR__ . '/../Models/CrowdReading.php';
require_once __DIR__ . '/../Utils/Validator.php';

class CrowdController {
    private $model;
    public function __construct($pdo) { $this->model = new CrowdReading($pdo); }

    public function handleRequest($method) {
        if ($method === 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            if (Validator::validateRequired($data, ['zone_id', 'density_count'])) {
                $this->model->create($data['zone_id'], $data['density_count'], date('Y-m-d H:i:s'));
                echo json_encode(["status" => "success", "message" => "Data tersimpan"]);
            } else {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Input tidak valid"]);
            }
        }
    }
}