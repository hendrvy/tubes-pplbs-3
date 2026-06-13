const express = require('express');
const axios = require('axios');
const router = express.Router();

const SERVICES = [
  { name: 'oauth-server',       url: process.env.OAUTH_SERVER_URL    + '/health' },
  { name: 'crowd-service',      url: process.env.CROWD_SERVICE_URL   + '/health' },
  { name: 'incident-service',   url: process.env.INCIDENT_SERVICE_URL + '/health' },
  { name: 'env-service',        url: process.env.ENV_SERVICE_URL     + '/health' },
  { name: 'python-ml',          url: process.env.PYTHON_ML_URL       + '/health' },
];

async function checkService(svc) {
  const start = Date.now();
  try {
    const res = await axios.get(svc.url, { timeout: 3000 });
    return {
      name: svc.name,
      status: 'up',
      latency_ms: Date.now() - start,
      detail: res.data,
    };
  } catch {
    return {
      name: svc.name,
      status: 'down',
      latency_ms: Date.now() - start,
      detail: null,
    };
  }
}

// GET /health — aggregasi status semua upstream service
router.get('/', async (req, res) => {
  const results = await Promise.all(SERVICES.map(checkService));

  const allUp = results.every(r => r.status === 'up');
  const overallStatus = allUp ? 'healthy' : 'degraded';

  res.status(allUp ? 200 : 207).json({
    status: overallStatus,
    code: allUp ? 200 : 207,
    gateway: 'up',
    timestamp: new Date().toISOString(),
    services: results,
  });
});

module.exports = router;
