require('dotenv').config();
const express = require('express');
const app = express();

// ── Middleware global ────────────────────────────────────────────────────────
const logger                             = require('./middleware/logger');
const jwtMiddleware                      = require('./middleware/jwt');
const introspectMiddleware               = require('./middleware/introspect');
const { globalLimiter, authLimiter, iotLimiter } = require('./middleware/rateLimit');
const errorHandler                       = require('./middleware/errorHandler');
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

// Parse body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Catat setiap request untuk Prometheus
app.use(metricsMiddleware);

// Log request ke console / file
app.use(logger);

// ── Public routes (tanpa auth) ───────────────────────────────────────────────
app.use('/health',  healthRouter);
app.use('/metrics', metricsRouter);

// Teruskan request OAuth ke OAuth Server A2 (tanpa JWT check)
app.use('/oauth', oauthProxy);

// ── IoT endpoints (rate limit khusus, tanpa JWT user biasa) ─────────────────
app.use('/iot/crowd',    iotLimiter, iotCrowdProxy);
app.use('/iot/security', iotLimiter, iotSecurityProxy);

// ── Protected routes ─────────────────────────────────────────────────────────
app.use(globalLimiter);       // 1. rate limit global per IP

app.use(jwtMiddleware);       // 2. verifikasi signature JWT (lokal, cepat)
                              //    → normalize payload A2 ke req.user standar

app.use(introspectMiddleware);// 3. introspect ke OAuth Server A2
                              //    → pastikan token belum di-revoke
                              //    → cache 30 detik agar tidak spam

app.use(authLimiter);         // 4. rate limit per token

// ── Routing ke upstream service ──────────────────────────────────────────────
app.use('/api/crowd',       crowdProxy);
app.use('/api/incidents',   incidentProxy);
app.use('/api/environment', envProxy);
app.use('/predict',         mlProxy);
app.use('/detect',          mlProxy);
app.use('/model',           mlProxy);

// ── 404 handler ───────────────────────────────────────────────────────────────
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
  console.log(`   NODE_ENV  : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health    : http://localhost:${PORT}/health`);
  console.log(`   Metrics   : http://localhost:${PORT}/metrics`);
  console.log(`   OAuth SVC : ${process.env.OAUTH_SERVER_URL || 'http://localhost:3002'}\n`);
});

module.exports = app; // untuk testing
