<?php
class CrowdController {
    private $pdo;
    public function __construct($pdo) { $this->pdo = $pdo; }

    public function submitReading($data) {
        // Support zone_id langsung atau zone string (dari IoT A5)
        $zone_id = $data['zone_id'] ?? null;

        // Kalau tidak ada zone_id, mapping dari zone string
        if (!$zone_id && isset($data['zone'])) {
            $map = ['zone1' => 1, 'zone2' => 2, 'zone3' => 3, 'zone4' => 4];
            $zone_id = $map[$data['zone']] ?? 1;
        }

        $density_count = $data['density_count'] ?? 0;
        $risk_level    = $data['risk_level']    ?? 'Aman';
        $source        = $data['source']        ?? 'manual';

        // Validasi risk_level
        $allowed = ['Aman', 'Waspada', 'Bahaya', 'Kritis', 'low', 'medium', 'high', 'critical'];
        if (!in_array($risk_level, $allowed)) $risk_level = 'Aman';

        $stmt = $this->pdo->prepare(
            "INSERT INTO crowd_readings (zone_id, density_count, risk_level, source) VALUES (?, ?, ?, ?)"
        );
        $stmt->execute([$zone_id, $density_count, $risk_level, $source]);

        return json_encode([
            'status'  => 'success',
            'code'    => 201,
            'data'    => [
                'id'            => $this->pdo->lastInsertId(),
                'zone_id'       => $zone_id,
                'density_count' => $density_count,
                'risk_level'    => $risk_level,
            ],
            'service' => 'php-citizen',
        ]);
    }

    public function getCurrent() {
        $stmt = $this->pdo->query(
            "SELECT cr.*, z.name as zone_name 
             FROM crowd_readings cr 
             LEFT JOIN zones z ON z.id = cr.zone_id 
             ORDER BY cr.recorded_at DESC LIMIT 20"
        );
        return json_encode([
            'status'  => 'success',
            'code'    => 200,
            'data'    => $stmt->fetchAll(PDO::FETCH_ASSOC),
            'service' => 'php-citizen',
        ]);
    }
}