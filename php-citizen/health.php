<?php
http_response_code(200);
echo json_encode(['status' => 'healthy', 'service' => 'citizen-service', 'timestamp' => date('c')]);
?>