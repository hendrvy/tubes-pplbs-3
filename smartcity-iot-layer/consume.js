import fs from "fs";
import path from "path";
import {
  closeRabbit,
  connectRabbit,
  queueBindings,
} from "./src/services/rabbitmq.service.js";

const consumerDir = path.resolve("consumer");
fs.mkdirSync(consumerDir, { recursive: true });

const channel = await connectRabbit();

for (const binding of queueBindings) {
  const messages = [];
  let msg;
  while ((msg = await channel.get(binding.queue, { noAck: false }))) {
    messages.push(JSON.parse(msg.content.toString()));
    channel.ack(msg);
  }
  if (messages.length > 0) {
    const filePath = path.join(consumerDir, `${binding.queue}.json`);
    fs.writeFileSync(filePath, JSON.stringify(messages, null, 2));
    console.log(`[${binding.queue}] Saved ${messages.length} messages`);
  } else {
    console.log(`[${binding.queue}] No messages`);
  }
}

await closeRabbit();
console.log("Done");
process.exit(0);
