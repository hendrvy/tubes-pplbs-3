export function normalizePayload(req, sourceType) {
  const body = { ...(req.body || {}) };
  if (req.headers["content-type"]?.includes("application/x-www-form-urlencoded")) {
    for (const [key, value] of Object.entries(body)) {
      if (!isNaN(Number(value)) && value !== "") body[key] = Number(value);
    }
  }
  body.source_type = sourceType;
  body.received_at = new Date().toISOString();
  body.zone = body.zone || req.params?.zone;
  return body;
}

export function requireFields(payload, fields) {
  for (const field of fields) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === "") {
      const error = new Error(`Missing required field: ${field}`);
      error.status = 400;
      error.code = "validation_error";
      throw error;
    }
  }
}
