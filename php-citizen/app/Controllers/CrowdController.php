<?php
class CrowdController {
    private $pdo;
    public function __construct($pdo) { $this->pdo = $pdo; }

    public function submitReading($data) {
        $stmt = $this->pdo->prepare("INSERT INTO crowd_readings (zone_id, density_count) VALUES (?, ?)");
        $stmt->execute([$data['zone_id'], $data['density_count']]);
        return json_encode(["status" => "success"]);
    }

    public function getCurrent() {
        $stmt = $this->pdo->query("SELECT * FROM crowd_readings ORDER BY id DESC LIMIT 10");
        return json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
}