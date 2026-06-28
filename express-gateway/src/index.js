require('dotenv').config();
const express = require('express');
const app = express();

const logger               = require('./middleware/logger');
const jwtMiddleware        = require('./middleware/jwt');
const introspectMiddleware = require('./middleware/introspect');
const { globalLimiter, authLimiter, iotLimiter } = require('./middleware/rateLimit');
const errorHandler         = require('./middleware/errorHandler');
const { router: metricsRouter, metricsMiddleware } = require('./routes/metrics');
const healthRouter         = require('./routes/health');
const {
  crowdProxy, incidentProxy, envProxy,
  mlProxy, oauthProxy, iotCrowdProxy, iotSecurityProxy,
} = require('./routes/proxy');

app.use(metricsMiddleware);
app.use(logger);

// ── Public routes — SEBELUM body parser ──────────────────────
app.use('/health',  healthRouter);
app.use('/metrics', metricsRouter);
app.use('/oauth',   oauthProxy);

// ── IoT endpoints — SEBELUM body parser ──────────────────────
app.use('/iot/crowd',    iotLimiter, iotCrowdProxy);
app.use('/iot/security', iotLimiter, iotSecurityProxy);

// ── Protected routes — SEBELUM body parser ───────────────────
app.use(globalLimiter);
app.use(jwtMiddleware);
app.use(introspectMiddleware);
app.use(authLimiter);

// ── Semua proxy SEBELUM body parser ──────────────────────────
// Dengan begini body tidak pernah ter-consume express
// dan langsung di-stream ke upstream service
app.use('/api/crowd',         crowdProxy);
app.use('/api/reports',       crowdProxy);
app.use('/api/notifications', crowdProxy);
app.use('/api/incidents',     incidentProxy);
app.use('/api/zones',         incidentProxy);
app.use('/predict',           mlProxy);
app.use('/detect',            mlProxy);
app.use('/model',             mlProxy);

// ── Body parser — setelah semua proxy ────────────────────────
// Hanya untuk route non-proxy yang butuh req.body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    status: 'error', code: 404,
    message: `Route '${req.method} ${req.path}' tidak ditemukan.`,
    timestamp: new Date().toISOString(),
    service: 'api-gateway',
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Smart Crowd Gateway berjalan di port ${PORT}`);
  console.log(`   NODE_ENV  : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health    : http://localhost:${PORT}/health`);
  console.log(`   Metrics   : http://localhost:${PORT}/metrics`);
  console.log(`   OAuth SVC : ${process.env.OAUTH_SERVER_URL || 'http://localhost:3002'}\n`);
});

module.exports = app;