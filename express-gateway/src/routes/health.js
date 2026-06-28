const express = require('express');
const axios = require('axios');

const router = express.Router();

const SERVICES = [
  {
    name: 'oauth-server',
    url: (process.env.OAUTH_SERVER_URL || 'http://oauth-server:3002') + '/oauth/token',
    method: 'post',
    data: {},
    validateStatus: (status) => status < 500,
  },
  {
    name: 'php-citizen',
    url: (process.env.CITIZEN_SERVICE_URL || 'http://php-citizen') + '/health.php',
    method: 'get',
    validateStatus: (status) => status < 500,
  },
  {
    name: 'php-traffic',
    url: (process.env.TRAFFIC_SERVICE_URL || 'http://php-traffic') + '/health.php',
    method: 'get',
    validateStatus: (status) => status < 500,
  },
  {
    name: 'python-ml',
    url: (process.env.PYTHON_ML_URL || 'http://python-ml:5000') + '/health',
    method: 'get',
    validateStatus: (status) => status < 500,
  },
];

async function checkService(service) {
  const start = Date.now();

  try {
    const response = await axios({
      method: service.method,
      url: service.url,
      data: service.data,
      timeout: 3000,
      validateStatus: service.validateStatus,
    });

    return {
      name: service.name,
      status: 'up',
      http_status: response.status,
      latency_ms: Date.now() - start,
    };
  } catch (err) {
    return {
      name: service.name,
      status: 'down',
      latency_ms: Date.now() - start,
      error: err.code || err.message,
    };
  }
}

router.get('/', async (req, res) => {
  const results = await Promise.all(
    SERVICES.map(checkService)
  );

  const allUp = results.every(service => service.status === 'up');

  res.status(allUp ? 200 : 207).json({
    status: allUp ? 'healthy' : 'degraded',
    code: allUp ? 200 : 207,
    gateway: 'up',
    timestamp: new Date().toISOString(),
    services: results,
  });
});

module.exports = router;