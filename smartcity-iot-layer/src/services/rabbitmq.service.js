import amqp from "amqplib";

const exchange = process.env.RABBITMQ_EXCHANGE || "city.events";
const rabbitUrl = process.env.RABBITMQ_URL || "amqp://iot_user:iot_secret@localhost:5672";

let connection;
let channel;

export const queueBindings = [
  { queue: "crowd.new", routingKey: "crowd.new" },
  { queue: "incident.new", routingKey: "incident.new" },
  { queue: "environment.new", routingKey: "environment.new" },
  { queue: "security.status", routingKey: "security.status" },
  { queue: "anomaly.alert", routingKey: "anomaly.alert" },
  { queue: "report.submitted", routingKey: "report.submitted" },
  { queue: "iot.command", routingKey: "iot.command" }
];

export async function connectRabbit() {
  if (channel) {
    return channel;
  }

  connection = await amqp.connect(rabbitUrl);
  connection.on("error", (error) => {
    console.error("RabbitMQ connection error:", error.message);
  });
  connection.on("close", () => {
    channel = undefined;
    connection = undefined;
  });

  channel = await connection.createConfirmChannel();
  await channel.assertExchange(exchange, "topic", { durable: true });

  for (const binding of queueBindings) {
    await channel.assertQueue(binding.queue, { durable: true });
    await channel.bindQueue(binding.queue, exchange, binding.routingKey);
  }

  return channel;
}

export async function publishEvent(routingKey, payload) {
  const activeChannel = await connectRabbit();
  const body = Buffer.from(JSON.stringify(payload));

  return new Promise((resolve, reject) => {
    activeChannel.publish(
      exchange,
      routingKey,
      body,
      {
        contentType: "application/json",
        deliveryMode: 2,
        timestamp: Date.now()
      },
      (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      }
    );
  });
}

export async function closeRabbit() {
  if (channel) {
    await channel.close();
  }
  if (connection) {
    await connection.close();
  }
}
