import { publishEvent } from "./rabbitmq.service.js";
import { normalizePayload, requireFields } from "../utils/payload.js";

export async function createCrowdEvent(req) {
  const payload = normalizePayload(req, "crowd");
  requireFields(payload, ["density_count", "risk_level", "speed"]);

  const routingKey = "crowd.new";
  await publishEvent(routingKey, payload);

  return { accepted: true, routing_key: routingKey, payload };
}

export async function createSecurityEvent(req) {
  const payload = normalizePayload(req, "security");
  requireFields(payload, ["incident_flag", "officer_count", "alert_level"]);

  const routingKey = payload.incident_flag ? "incident.new" : "security.status";
  await publishEvent(routingKey, payload);

  return { accepted: true, routing_key: routingKey, payload };
}

export async function createEnvironmentEvent(req) {
  const payload = normalizePayload(req, "environment");
  requireFields(payload, ["temperature", "humidity", "visibility"]);

  const routingKey = "environment.new";
  await publishEvent(routingKey, payload);

  return { accepted: true, routing_key: routingKey, payload };
}

export async function createAnomalyAlert(body) {
  const payload = {
    ...body,
    source: body.source || "python-ml",
    received_at: new Date().toISOString()
  };
  requireFields(payload, ["zone", "alert_level", "reason"]);

  const routingKey = "anomaly.alert";
  await publishEvent(routingKey, payload);

  return { accepted: true, routing_key: routingKey, payload };
}

export async function createCommand(body) {
  const payload = {
    ...body,
    requested_at: new Date().toISOString()
  };
  requireFields(payload, ["command", "target"]);

  const routingKey = "iot.command";
  await publishEvent(routingKey, payload);

  return { accepted: true, routing_key: routingKey, payload };
}
