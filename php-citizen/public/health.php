<?php

http_response_code(200);

header('Content-Type: application/json');

echo json_encode([
    "status" => "healthy",
    "service" => "php-citizen",
    "timestamp" => date("c")
]);