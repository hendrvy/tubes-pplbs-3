<?php
class NotifController {
    private $pdo;
    public function __construct($pdo) { $this->pdo = $pdo; }

    public function index() {
        $stmt = $this->pdo->query("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20");
        return json_encode([
            'status' => 'success',
            'code'   => 200,
            'data'   => $stmt->fetchAll(PDO::FETCH_ASSOC),
            'service'=> 'php-citizen',
        ]);
    }
}