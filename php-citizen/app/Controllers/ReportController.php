<?php
class ReportController {
    private $pdo;
    public function __construct($pdo) { $this->pdo = $pdo; }

    public function submit($data) {
        $zone_id     = $data['zone_id']     ?? 0;
        $description = $data['description'] ?? '';
        $status      = $data['status']      ?? 'open';

        // Validasi status
        $allowed = ['open', 'in_progress', 'resolved'];
        if (!in_array($status, $allowed)) $status = 'open';

        $stmt = $this->pdo->prepare(
            "INSERT INTO reports (zone_id, description, status) VALUES (?, ?, ?)"
        );
        $stmt->execute([$zone_id, $description, $status]);

        $id = $this->pdo->lastInsertId();
        return json_encode([
            'status'  => 'success',
            'code'    => 201,
            'data'    => ['id' => $id, 'zone_id' => $zone_id, 'description' => $description, 'status' => $status],
            'service' => 'php-citizen',
        ]);
    }

    public function updateStatus($id, $data) {
        $status = $data['status'] ?? 'open';

        // Validasi — hanya nilai ENUM yang diizinkan
        $allowed = ['open', 'in_progress', 'resolved'];
        if (!in_array($status, $allowed)) {
            http_response_code(422);
            return json_encode([
                'status'  => 'error',
                'code'    => 422,
                'message' => "Status tidak valid. Gunakan: open, in_progress, resolved",
                'service' => 'php-citizen',
            ]);
        }

        $stmt = $this->pdo->prepare("UPDATE reports SET status = ? WHERE id = ?");
        $stmt->execute([$status, $id]);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            return json_encode([
                'status'  => 'error',
                'code'    => 404,
                'message' => "Report ID $id tidak ditemukan",
                'service' => 'php-citizen',
            ]);
        }

        return json_encode([
            'status'  => 'success',
            'code'    => 200,
            'data'    => ['id' => $id, 'status' => $status],
            'service' => 'php-citizen',
        ]);
    }

    public function list($params) {
        $query  = "SELECT * FROM reports WHERE 1=1";
        $binds  = [];

        if (isset($params['zone_id'])) {
            $query .= " AND zone_id = ?";
            $binds[] = (int)$params['zone_id'];
        }
        if (isset($params['status'])) {
            $query .= " AND status = ?";
            $binds[] = $params['status'];
        }

        $query .= " ORDER BY created_at DESC";
        $stmt = $this->pdo->prepare($query);
        $stmt->execute($binds);

        return json_encode([
            'status'  => 'success',
            'code'    => 200,
            'data'    => $stmt->fetchAll(PDO::FETCH_ASSOC),
            'service' => 'php-citizen',
        ]);
    }
}