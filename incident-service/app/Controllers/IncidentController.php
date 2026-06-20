<?php
class IncidentController {
    private $pdo;
    public function __construct($pdo) { $this->pdo = $pdo; }

    public function create($data) {
        // Kolom 'status' dihapus karena mungkin tidak ada di database Anda
        $stmt = $this->pdo->prepare("INSERT INTO incidents (type, description, zone_id) VALUES (?, ?, ?)");
        $stmt->execute([$data['type'], $data['description'], $data['zone_id']]);
        
        return json_encode(["status" => "success", "message" => "Insiden berhasil dibuat"]);
    }

    public function listActive() {
        // Query disederhanakan tanpa memfilter 'status'
        $stmt = $this->pdo->query("SELECT * FROM incidents");
        return json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
}