const rateLimit = require('express-rate-limit');

// ── Global rate limit: 100 request per 15 menit per IP ──────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 429,
    message: 'Terlalu banyak request dari IP ini. Coba lagi dalam 15 menit.',
    timestamp: new Date().toISOString(),
    service: 'api-gateway',
  },
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  },
});

// ── Auth rate limit: 500 request per jam per token ──────────────────────────
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 500,
  standardHeaders: true,
  legacyHeaders: false,
  // Kunci berdasarkan token jika ada, fallback ke IP
  keyGenerator: (req) => {
    const auth = req.headers['authorization'];
    return auth ? auth.replace('Bearer ', '') : req.ip;
  },
  message: {
    status: 'error',
    code: 429,
    message: 'Limit request per token terlampaui. Coba lagi dalam 1 jam.',
    timestamp: new Date().toISOString(),
    service: 'api-gateway',
  },
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  },
});

// ── Rate limit ketat untuk endpoint IoT ─────────────────────────────────────
const iotLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 menit
  max: 120,                   // 2 request per detik (sensor publish tiap 30 dtk)
  keyGenerator: (req) => req.ip,
  message: {
    status: 'error',
    code: 429,
    message: 'IoT rate limit tercapai.',
    timestamp: new Date().toISOString(),
    service: 'api-gateway',
  },
});

module.exports = { globalLimiter, authLimiter, iotLimiter };
