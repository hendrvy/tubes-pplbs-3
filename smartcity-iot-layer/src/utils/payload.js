const zones = new Set(["zone1", "zone2", "zone3", "zone4"]);

export function normalizePayload(req, sensorType) {
  const zone = req.body.zone || req.body.zone_id || req.query.zone;
  if (!zones.has(zone)) {
    const error = new Error("Invalid or missing zone. Expected zone1, zone2, zone3, or zone4.");
    error.statusCode = 400;
    throw error;
  }

  return {
    ...req.body,
    zone,
    sensor_type: sensorType,
    received_at: new Date().toISOString()
  };
}

export function requireFields(payload, fields) {
  const missing = fields.filter((field) => payload[field] === undefined || payload[field] === null);
  if (missing.length > 0) {
    const error = new Error(`Missing required field(s): ${missing.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }
}
