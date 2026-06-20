<?php
class ReportController {
    private $pdo;
    public function __construct($pdo) { $this->pdo = $pdo; }

    public function submit($data) {
        // Menggunakan filter agar tidak error jika field kosong
        $zone_id = $data['zone_id'] ?? 0;
        $description = $data['description'] ?? '';
        
        $stmt = $this->pdo->prepare("INSERT INTO reports (zone_id, description) VALUES (?, ?)");
        $stmt->execute([$zone_id, $description]);
        return json_encode(["status" => "success"]);
    }

    public function updateStatus($id, $data) {
        // Pengecekan aman untuk kunci 'status'
        $status = $data['status'] ?? 'pending';
        
        $stmt = $this->pdo->prepare("UPDATE reports SET status = ? WHERE id = ?");
        $stmt->execute([$status, $id]);
        return json_encode(["status" => "updated"]);
    }

    public function list($params) {
        $query = "SELECT * FROM reports";
        // Tambahkan logika filter jika ada parameter zone
        if (isset($params['zone'])) {
            $query .= " WHERE zone_id = " . (int)$params['zone'];
        }
        $stmt = $this->pdo->query($query);
        return json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
}