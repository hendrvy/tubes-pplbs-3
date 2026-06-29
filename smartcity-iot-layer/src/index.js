import "dotenv/config";

import { createApp } from "./app.js";
import { closeRabbit, connectRabbit } from "./services/rabbitmq.service.js";

const port = Number(process.env.PORT || 3000);
const app = createApp();

const server = app.listen(port, () => {
  connectRabbit()
    .then(() => console.log("RabbitMQ exchange and queues are ready"))
    .catch((error) => console.error("RabbitMQ startup connection failed:", error.message));

  console.log(`City IoT API listening on port ${port}`);
});

async function shutdown() {
  server.close(async () => {
    await closeRabbit();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
