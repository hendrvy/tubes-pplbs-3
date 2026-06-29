const { createProxyMiddleware } = require('http-proxy-middleware');

function makeProxy(target, pathRewrite = {}) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,

    on: {
      proxyReq: (proxyReq, req) => {
        if (req.user) {
          proxyReq.setHeader('X-User-Id', req.user.userId || req.user.id || '');
          proxyReq.setHeader('X-User-Role', req.user.role || '');
          proxyReq.setHeader('X-User-Zone', req.user.zone_id || '');
        }

        proxyReq.setHeader('X-Forwarded-By', 'smart-crowd-gateway');
      },

      error: (err, req, res) => {
        console.error(`[PROXY ERROR] ${target}`);
        console.error(err);

        if (!res.headersSent) {
          res.status(502).json({
            status: "error",
            code: 502,
            message: err.message,
            target,
          });
        }
      }
    }
  });
}

const crowdProxy = makeProxy(
  process.env.CITIZEN_SERVICE_URL || 'http://php-citizen'
);

const incidentProxy = makeProxy(
  process.env.TRAFFIC_SERVICE_URL || 'http://php-traffic'
);

const mlProxy = makeProxy(
  process.env.PYTHON_ML_URL || 'http://python-ml:5000'
);

const oauthProxy = makeProxy(
  process.env.OAUTH_SERVER_URL || 'http://oauth-server:3002'
);

const iotCrowdProxy = makeProxy(
  process.env.CITIZEN_SERVICE_URL || 'http://php-citizen',
  {
    '^/iot/crowd': '/api/crowd/readings'
  }
);

const iotSecurityProxy = makeProxy(
  process.env.TRAFFIC_SERVICE_URL || 'http://php-traffic',
  {
    '^/iot/security': '/api/incidents'
  }
);

module.exports = {
  crowdProxy,
  incidentProxy,
  mlProxy,
  oauthProxy,
  iotCrowdProxy,
  iotSecurityProxy
};