<?php
class AlertController {
    private $pdo;
    public function __construct($pdo) { $this->pdo = $pdo; }

    public function index() {
        // Logika mengambil notifikasi untuk petugas
        $stmt = $this->pdo->query("SELECT * FROM notifications ORDER BY created_at DESC");
        return json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
}