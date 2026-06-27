<?php
class IncidentController {
    private $pdo;
    public function __construct($pdo) { $this->pdo = $pdo; }

    public function create($data) {
        // Support zone_id langsung atau zone string (dari IoT A5)
        $zone_id = $data['zone_id'] ?? null;
        if (!$zone_id && isset($data['zone'])) {
            $map = ['zone1' => 1, 'zone2' => 2, 'zone3' => 3, 'zone4' => 4];
            $zone_id = $map[$data['zone']] ?? 1;
        }

        // IoT A5 kirim incident_flag & alert_level, bukan type & description
        $type        = $data['type']        ?? ($data['incident_flag'] ? 'crowd_surge' : 'security_status');
        $description = $data['description'] ?? ('Alert level: ' . ($data['alert_level'] ?? 'low') . ', Officers: ' . ($data['officer_count'] ?? 0));
        $severity    = $data['severity']    ?? $this->mapAlertLevel($data['alert_level'] ?? 'low');

        $stmt = $this->pdo->prepare(
            "INSERT INTO incidents (zone_id, type, severity, description, status) VALUES (?, ?, ?, ?, 'active')"
        );
        $stmt->execute([$zone_id, $type, $severity, $description]);

        return json_encode([
            'status'  => 'success',
            'code'    => 201,
            'data'    => [
                'id'       => $this->pdo->lastInsertId(),
                'zone_id'  => $zone_id,
                'type'     => $type,
                'severity' => $severity,
            ],
            'service' => 'incident-service',
        ]);
    }

    // Mapping alert_level A5 ke severity DB
    private function mapAlertLevel($level) {
        $map = ['low' => 'low', 'medium' => 'medium', 'high' => 'high', 'critical' => 'critical'];
        return $map[$level] ?? 'medium';
    }

    public function listActive() {
        $stmt = $this->pdo->query(
            "SELECT i.*, z.name as zone_name 
             FROM incidents i 
             LEFT JOIN zones z ON z.id = i.zone_id 
             ORDER BY i.reported_at DESC LIMIT 20"
        );
        return json_encode([
            'status'  => 'success',
            'code'    => 200,
            'data'    => $stmt->fetchAll(PDO::FETCH_ASSOC),
            'service' => 'incident-service',
        ]);
    }

    public function resolve($id, $data) {
        $resolution_note = $data['resolution_note'] ?? '';

        $stmt = $this->pdo->prepare(
            "UPDATE incidents SET status = 'resolved', resolved_at = NOW() WHERE id = ?"
        );
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            return json_encode([
                'status'  => 'error',
                'code'    => 404,
                'message' => "Incident ID $id tidak ditemukan",
                'service' => 'incident-service',
            ]);
        }

        return json_encode([
            'status'  => 'success',
            'code'    => 200,
            'data'    => [
                'id'              => $id,
                'status'          => 'resolved',
                'resolution_note' => $resolution_note,
                'resolved_at'     => date('c'),
            ],
            'service' => 'incident-service',
        ]);
    }
}