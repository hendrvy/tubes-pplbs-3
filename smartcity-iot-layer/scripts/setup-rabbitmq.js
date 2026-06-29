import "dotenv/config";

import { closeRabbit, connectRabbit, queueBindings } from "../src/services/rabbitmq.service.js";

try {
  await connectRabbit();
  console.log("RabbitMQ exchange and queues are ready:");
  for (const binding of queueBindings) {
    console.log(`- ${binding.queue} <= ${binding.routingKey}`);
  }
  await closeRabbit();
} catch (error) {
  console.error("Failed to setup RabbitMQ:", error.message);
  process.exitCode = 1;
}
