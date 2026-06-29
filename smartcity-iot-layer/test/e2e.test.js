import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import test from "node:test";
import { promisify } from "node:util";

import amqp from "amqplib";

const execFileAsync = promisify(execFile);

const apiBaseUrl = process.env.TEST_API_BASE_URL || "http://localhost:3000";
const rabbitUrl = process.env.RABBITMQ_URL || "amqp://iot_user:iot_secret@localhost:5672";
const rabbitExchange = process.env.RABBITMQ_EXCHANGE || "city.events";
const simulatorPython = process.env.SIMULATOR_PYTHON || ".venv/bin/python";
const testRunId = `js-e2e-${Date.now()}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retry(label, action, options = {}) {
  const attempts = options.attempts || 20;
  const delayMs = options.delayMs || 500;
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleep(delayMs);
      }
    }
  }

  throw new Error(`${label} failed after ${attempts} attempts: ${lastError.message}`);
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });

  const body = await response.text();
  let json;
  try {
    json = body ? JSON.parse(body) : {};
  } catch {
    json = { raw: body };
  }

  return { response, json };
}

async function connectRabbit() {
  const connection = await amqp.connect(rabbitUrl);
  const channel = await connection.createChannel();

  return {
    channel,
    async close() {
      await channel.close();
      await connection.close();
    }
  };
}

async function queueMessageCount(channel, queueName) {
  const result = await channel.checkQueue(queueName);
  return result.messageCount;
}

async function assertRabbitTopology(channel) {
  await channel.checkExchange(rabbitExchange);

  const expectedQueues = [
    "crowd.new",
    "incident.new",
    "environment.new",
    "security.status",
    "anomaly.alert",
    "report.submitted",
    "iot.command"
  ];

  for (const queueName of expectedQueues) {
    await channel.checkQueue(queueName);
  }
}

async function waitForQueueIncrease(channel, queueName, beforeCount, label) {
  return retry(label, async () => {
    const currentCount = await queueMessageCount(channel, queueName);
    assert.ok(
      currentCount > beforeCount,
      `${queueName} expected to increase from ${beforeCount}, current ${currentCount}`
    );
    return currentCount;
  });
}

async function publishMqtt(topic, payload) {
  await execFileAsync("docker", [
    "compose",
    "exec",
    "-T",
    "mosquitto",
    "mosquitto_pub",
    "-h",
    "localhost",
    "-p",
    "1883",
    "-u",
    "iot_device",
    "-P",
    "iot_secret",
    "-t",
    topic,
    "-m",
    JSON.stringify(payload)
  ]);
}

function startSimulator(runId) {
  if (!existsSync(simulatorPython)) {
    throw new Error(
      `Simulator Python not found at ${simulatorPython}. Run: python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`
    );
  }

  const child = spawn(simulatorPython, ["iot/simulator.py"], {
    env: {
      ...process.env,
      MQTT_HOST: process.env.TEST_MQTT_HOST || "localhost",
      MQTT_PORT: process.env.TEST_MQTT_PORT || "1884",
      MQTT_USERNAME: process.env.TEST_MQTT_USERNAME || "iot_device",
      MQTT_PASSWORD: process.env.TEST_MQTT_PASSWORD || "iot_secret",
      PUBLISH_INTERVAL_SECONDS: "1",
      SIMULATOR_RUN_ID: runId
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  return {
    child,
    get output() {
      return output;
    },
    stop() {
      if (!child.killed) {
        child.kill("SIGINT");
      }
    }
  };
}

async function waitForSimulatorEvents(channel, runId, expectedCount, timeoutMs) {
  const queueName = `e2e.simulator.${runId}`;
  const assertedQueue = await channel.assertQueue(queueName, {
    autoDelete: true,
    durable: false,
    exclusive: true
  });

  await channel.bindQueue(assertedQueue.queue, rabbitExchange, "crowd.new");
  await channel.bindQueue(assertedQueue.queue, rabbitExchange, "incident.new");
  await channel.bindQueue(assertedQueue.queue, rabbitExchange, "environment.new");
  await channel.prefetch(10);

  let matchedCount = 0;
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    let consumerTag;
    const timeout = setTimeout(() => {
      reject(
        new Error(
          `Simulator events did not reach RabbitMQ within ${timeoutMs}ms. Matched ${matchedCount}/${expectedCount}.`
        )
      );
    }, timeoutMs);

    channel
      .consume(assertedQueue.queue, (message) => {
        if (!message) {
          return;
        }

        try {
          const payload = JSON.parse(message.content.toString());
          channel.ack(message);

          if (payload.test_run_id !== runId) {
            return;
          }

          matchedCount += 1;
          if (matchedCount >= expectedCount) {
            clearTimeout(timeout);
            channel
              .cancel(consumerTag)
              .catch(() => {})
              .finally(() => {
                resolve({
                  queueName: assertedQueue.queue,
                  matchedCount,
                  elapsedMs: Date.now() - startedAt
                });
              });
          }
        } catch (error) {
          channel.nack(message, false, false);
          clearTimeout(timeout);
          reject(error);
        }
      })
      .then(async (consumer) => {
        consumerTag = consumer.consumerTag;
        const queueState = await channel.checkQueue(assertedQueue.queue);
        assert.ok(queueState.consumerCount >= 1, "expected active RabbitMQ consumer");
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

test("city IoT stack end-to-end", async (t) => {
  await t.test("API health exposes RabbitMQ queue setup", async () => {
    const { response, json } = await retry("GET /health", async () => {
      const result = await requestJson("/health");
      assert.equal(result.response.status, 200);
      return result;
    });

    assert.equal(response.status, 200);
    assert.equal(json.status, "ok");
    assert.equal(json.rabbitmq, "connected");
    assert.deepEqual(json.queues.sort(), [
      "anomaly.alert",
      "crowd.new",
      "environment.new",
      "incident.new",
      "iot.command",
      "report.submitted",
      "security.status"
    ]);
  });

  const rabbit = await connectRabbit();
  t.after(async () => {
    await rabbit.close();
  });

  await t.test("RabbitMQ exchange and queues are configured", async () => {
    await assertRabbitTopology(rabbit.channel);
  });

  await t.test("direct API POST publishes crowd.new to RabbitMQ", async () => {
    const beforeCount = await queueMessageCount(rabbit.channel, "crowd.new");
    const payload = {
      zone: "zone1",
      density_count: 501,
      risk_level: "medium",
      speed: 1.7,
      test_run_id: testRunId
    };

    const { response, json } = await requestJson("/iot/crowd", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    assert.equal(response.status, 202);
    assert.equal(json.accepted, true);
    assert.equal(json.routing_key, "crowd.new");

    await waitForQueueIncrease(rabbit.channel, "crowd.new", beforeCount, "crowd.new direct API publish");
  });

  await t.test("direct API POST publishes incident.new to RabbitMQ", async () => {
    const beforeCount = await queueMessageCount(rabbit.channel, "incident.new");
    const payload = {
      zone: "zone2",
      incident_flag: true,
      officer_count: 4,
      alert_level: "high",
      test_run_id: testRunId
    };

    const { response, json } = await requestJson("/iot/security", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    assert.equal(response.status, 202);
    assert.equal(json.accepted, true);
    assert.equal(json.routing_key, "incident.new");

    await waitForQueueIncrease(rabbit.channel, "incident.new", beforeCount, "incident.new direct API publish");
  });

  await t.test("direct API POST publishes environment.new to RabbitMQ", async () => {
    const beforeCount = await queueMessageCount(rabbit.channel, "environment.new");
    const payload = {
      zone: "zone3",
      temperature: 30.5,
      humidity: 78.1,
      visibility: 8.5,
      test_run_id: testRunId
    };

    const { response, json } = await requestJson("/iot/environment", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    assert.equal(response.status, 202);
    assert.equal(json.accepted, true);
    assert.equal(json.routing_key, "environment.new");

    const afterCount = await queueMessageCount(rabbit.channel, "environment.new");
    assert.ok(afterCount > beforeCount, `environment.new expected to increase from ${beforeCount}, current ${afterCount}`);
  });

  await t.test("MQTT crowd message is bridged by Node-RED to RabbitMQ", async () => {
    const beforeCount = await queueMessageCount(rabbit.channel, "crowd.new");

    await publishMqtt("city/zone4/crowd", {
      zone: "zone4",
      density_count: 888,
      risk_level: "high",
      speed: 3.9,
      timestamp: new Date().toISOString(),
      test_run_id: testRunId
    });

    await waitForQueueIncrease(rabbit.channel, "crowd.new", beforeCount, "crowd MQTT bridge");
  });

  await t.test("MQTT security incident is bridged by Node-RED to RabbitMQ", async () => {
    const beforeCount = await queueMessageCount(rabbit.channel, "incident.new");

    await publishMqtt("city/zone2/security", {
      zone: "zone2",
      incident_flag: true,
      officer_count: 2,
      alert_level: "critical",
      timestamp: new Date().toISOString(),
      test_run_id: testRunId
    });

    await waitForQueueIncrease(rabbit.channel, "incident.new", beforeCount, "security MQTT bridge");
  });

  await t.test("MQTT environment message is bridged by Node-RED to RabbitMQ", async () => {
    const beforeCount = await queueMessageCount(rabbit.channel, "environment.new");

    await publishMqtt("city/zone3/environment", {
      zone: "zone3",
      temperature: 28.5,
      humidity: 72.0,
      visibility: 6.5,
      timestamp: new Date().toISOString(),
      test_run_id: testRunId
    });

    await waitForQueueIncrease(rabbit.channel, "environment.new", beforeCount, "environment MQTT bridge");
  });

  await t.test("simulator sends data through MQTT -> Node-RED -> API -> RabbitMQ in under 60 seconds", async () => {
    const simulatorRunId = `${testRunId}-simulator`;
    const simulator = startSimulator(simulatorRunId);
    t.after(() => simulator.stop());

    const result = await waitForSimulatorEvents(rabbit.channel, simulatorRunId, 12, 60_000);
    simulator.stop();

    assert.ok(result.matchedCount >= 12, `expected >= 12 simulator events, got ${result.matchedCount}`);
    assert.ok(result.elapsedMs < 60_000, `expected simulator flow under 60s, got ${result.elapsedMs}ms`);

    console.log(
      `Simulator criterion passed: ${result.matchedCount} events consumed from ${result.queueName} in ${result.elapsedMs}ms`
    );
  });
});
