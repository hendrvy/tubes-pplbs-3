import { publishEvent } from "./rabbitmq.service.js";
import { requireFields } from "../utils/payload.js";

export async function createReport(body) {
  const payload = {
    ...body,
    submitted_at: body.submitted_at || new Date().toISOString()
  };
  requireFields(payload, ["report_id", "zone", "message"]);

  const routingKey = "report.submitted";
  await publishEvent(routingKey, payload);

  return { accepted: true, routing_key: routingKey, payload };
}
