const express = require('express');
const axios = require('axios');
const router = express.Router();

// Setiap service punya endpoint health yang berbeda
// A2 tidak punya /health — pakai POST /oauth/introspect dengan token kosong
// kalau dapat 400/401 berarti service UP (bukan network error)
const SERVICES = [
  {
    name: 'oauth-server',
    url:  (process.env.OAUTH_SERVER_URL || 'http://localhost:3002') + '/oauth/token',
    method: 'post',
    // kirim body kosong — A2 akan balas 400 (bukan 502/ECONNREFUSED)
    // 400 = service UP, ECONNREFUSED = service DOWN
    data: '',
    validateStatus: (s) => s < 500, // 400 = up, 5xx = down
  },
  {
    name: 'crowd-service',
    url:  (process.env.CROWD_SERVICE_URL || 'http://localhost:8000') + '/health',
    method: 'get',
    validateStatus: (s) => s < 500,
  },
  {
    name: 'incident-service',
    url:  (process.env.INCIDENT_SERVICE_URL || 'http://localhost:8001') + '/health',
    method: 'get',
    validateStatus: (s) => s < 500,
  },
  {
    name: 'env-service',
    url:  (process.env.ENV_SERVICE_URL || 'http://localhost:8002') + '/health',
    method: 'get',
    validateStatus: (s) => s < 500,
  },
  {
    name: 'python-ml',
    url:  (process.env.PYTHON_ML_URL || 'http://localhost:5000') + '/health',
    method: 'get',
    validateStatus: (s) => s < 500,
  },
];

async function checkService(svc) {
  const start = Date.now();
  try {
    const res = await axios({
      method: svc.method || 'get',
      url: svc.url,
      data: svc.data,
      timeout: 3000,
      validateStatus: svc.validateStatus || ((s) => s < 500),
    });
    return {
      name: svc.name,
      status: 'up',
      latency_ms: Date.now() - start,
      http_status: res.status,
    };
  } catch {
    return {
      name: svc.name,
      status: 'down',
      latency_ms: Date.now() - start,
    };
  }
}

router.get('/', async (req, res) => {
  const results = await Promise.all(SERVICES.map(checkService));
  const allUp = results.every(r => r.status === 'up');

  res.status(allUp ? 200 : 207).json({
    status: allUp ? 'healthy' : 'degraded',
    code: allUp ? 200 : 207,
    gateway: 'up',
    timestamp: new Date().toISOString(),
    services: results,
  });
});

module.exports = router;