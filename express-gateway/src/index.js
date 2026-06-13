require('dotenv').config();
const express = require('express');
const app = express();

// ── Middleware global ────────────────────────────────────────────────────────
const logger                              = require('./middleware/logger');
const jwtMiddleware                       = require('./middleware/jwt');
const { globalLimiter, authLimiter, iotLimiter } = require('./middleware/rateLimit');
const errorHandler                        = require('./middleware/errorHandler');
const { router: metricsRouter, metricsMiddleware } = require('./routes/metrics');

// ── Routes ───────────────────────────────────────────────────────────────────
const healthRouter = require('./routes/health');
const {
  crowdProxy,
  incidentProxy,
  envProxy,
  mlProxy,
  oauthProxy,
  iotCrowdProxy,
  iotSecurityProxy,
} = require('./routes/proxy');

// Parse JSON body
app.use(express.json());

// Catat setiap request untuk Prometheus
app.use(metricsMiddleware);

// Log request ke console / file
app.use(logger);

// ── Public routes (tanpa auth, tanpa rate limit ketat) ──────────────────────
app.use('/health',  healthRouter);
app.use('/metrics', metricsRouter);

// Teruskan request OAuth ke OAuth Server (auth ditangani di sana)
app.use('/oauth',   oauthProxy);

// ── IoT endpoints (rate limit khusus IoT, tidak butuh JWT user biasa) ───────
app.use('/iot/crowd',    iotLimiter, iotCrowdProxy);
app.use('/iot/security', iotLimiter, iotSecurityProxy);

// ── Protected routes (JWT wajib + auth rate limit) ──────────────────────────
app.use(globalLimiter);   // global rate limit untuk semua request berikutnya
app.use(jwtMiddleware);   // verifikasi JWT
app.use(authLimiter);     // rate limit per token

// Routing ke upstream service berdasarkan path prefix
app.use('/api/crowd',       crowdProxy);
app.use('/api/incidents',   incidentProxy);
app.use('/api/environment', envProxy);
app.use('/predict',         mlProxy);
app.use('/detect',          mlProxy);
app.use('/model',           mlProxy);

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    code: 404,
    message: `Route '${req.method} ${req.path}' tidak ditemukan di gateway.`,
    timestamp: new Date().toISOString(),
    service: 'api-gateway',
  });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Smart Crowd Gateway berjalan di port ${PORT}`);
  console.log(`   NODE_ENV : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health   : http://localhost:${PORT}/health`);
  console.log(`   Metrics  : http://localhost:${PORT}/metrics\n`);
});

module.exports = app; // untuk testing
