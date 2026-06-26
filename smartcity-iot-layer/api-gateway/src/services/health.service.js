import { connectRabbit } from "./rabbitmq.service.js";

export async function checkHealth() {
  try {
    const channel = await connectRabbit();
    const queueNames = ["crowd.new", "incident.new", "anomaly.alert", "report.submitted", "iot.command"];
    const queues = [];
    for (const name of queueNames) {
      try {
        const info = await channel.checkQueue(name);
        queues.push({ name, messages: info.messageCount, consumers: info.consumerCount });
      } catch { queues.push({ name, error: "not_found" }); }
    }
    return { status: "ok", rabbitmq: "connected", queues };
  } catch {
    return { status: "degraded", rabbitmq: "disconnected" };
  }
}
