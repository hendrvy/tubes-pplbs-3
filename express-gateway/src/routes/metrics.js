const express = require('express');
const client = require('prom-client');
const router = express.Router();

// Aktifkan default metrics (CPU, memory, event loop, dll)
client.collectDefaultMetrics({ prefix: 'gateway_' });

// ── Custom metrics ───────────────────────────────────────────────────────────
const httpRequestCounter = new client.Counter({
  name: 'gateway_http_requests_total',
  help: 'Total HTTP requests masuk ke gateway',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestDuration = new client.Histogram({
  name: 'gateway_http_request_duration_seconds',
  help: 'Durasi HTTP request dalam detik',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

const upstreamErrorCounter = new client.Counter({
  name: 'gateway_upstream_errors_total',
  help: 'Total error dari upstream service',
  labelNames: ['service'],
});

// Middleware untuk mencatat setiap request
function metricsMiddleware(req, res, next) {
  const end = httpRequestDuration.startTimer({
    method: req.method,
    route: req.path,
  });

  res.on('finish', () => {
    httpRequestCounter.inc({
      method: req.method,
      route: req.path,
      status_code: res.statusCode,
    });
    end();
  });

  next();
}

// GET /metrics — endpoint untuk Prometheus scrape
router.get('/', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

module.exports = { router, metricsMiddleware, upstreamErrorCounter };
