<?php
class CrowdReading {
    private $pdo;
    public function __construct($pdo) { $this->pdo = $pdo; }

    public function create($zone_id, $density_count, $recorded_at) {
        $stmt = $this->pdo->prepare("INSERT INTO crowd_readings (zone_id, density_count, recorded_at) VALUES (?, ?, ?)");
        return $stmt->execute([$zone_id, $density_count, $recorded_at]);
    }
}