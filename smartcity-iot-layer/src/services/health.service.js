import { connectRabbit, queueBindings } from "./rabbitmq.service.js";

export async function getHealthStatus() {
  await connectRabbit();

  return {
    status: "ok",
    rabbitmq: "connected",
    queues: queueBindings.map((binding) => binding.queue)
  };
}
