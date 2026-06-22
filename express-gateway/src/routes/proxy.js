const { createProxyMiddleware } = require('http-proxy-middleware');

function makeProxy(target, pathRewrite = {}) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    on: {
      proxyReq: (proxyReq, req) => {
        if (req.user) {
          proxyReq.setHeader('X-User-Id',  req.user.id  || '');
          proxyReq.setHeader('X-User-Role', req.user.role || '');
          proxyReq.setHeader('X-User-Zone', req.user.zone_id || '');
        }
        proxyReq.setHeader('X-Forwarded-By', 'smart-crowd-gateway');
      },
      error: (err, req, res) => {
        console.error(`[PROXY ERROR] ${target} - ${err.message}`);
        if (!res.headersSent) {
          res.status(502).json({
            status: 'error', code: 502,
            message: `Service tidak dapat dijangkau: ${target}`,
            timestamp: new Date().toISOString(),
            service: 'api-gateway',
          });
        }
      },
    },
  });
}

const crowdProxy       = makeProxy(process.env.CROWD_SERVICE_URL    || 'http://localhost:8000');
const incidentProxy    = makeProxy(process.env.INCIDENT_SERVICE_URL || 'http://localhost:8001');
const envProxy         = makeProxy(process.env.ENV_SERVICE_URL      || 'http://localhost:8002');
const mlProxy          = makeProxy(process.env.PYTHON_ML_URL        || 'http://localhost:5000');
const oauthProxy       = makeProxy(process.env.OAUTH_SERVER_URL     || 'http://localhost:3002');
const iotCrowdProxy    = makeProxy(process.env.CROWD_SERVICE_URL    || 'http://localhost:8000', { '^/iot/crowd': '/api/crowd/readings' });
const iotSecurityProxy = makeProxy(process.env.INCIDENT_SERVICE_URL || 'http://localhost:8001', { '^/iot/security': '/api/incidents' });

module.exports = { crowdProxy, incidentProxy, envProxy, mlProxy, oauthProxy, iotCrowdProxy, iotSecurityProxy };