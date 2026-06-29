const axios = require('axios');

// Cache introspect result selama 30 detik biar tidak spam ke A2
const cache = new Map();
const CACHE_TTL_MS = 30 * 1000;

function getCached(token) {
  const entry = cache.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(token);
    return null;
  }
  return entry.result;
}

function setCache(token, result) {
  cache.set(token, {
    result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// Endpoint yang tidak perlu introspect
const PUBLIC_PATHS = [
  '/health',
  '/metrics',
  '/oauth/token',
  '/oauth/introspect',
  '/oauth/revoke',
];

async function introspectMiddleware(req, res, next) {
  // Skip untuk public paths
  if (PUBLIC_PATHS.some(p => req.path.startsWith(p))) {
    return next();
  }

  // Skip untuk IoT — pakai client_credentials, sudah lolos JWT middleware
  if (req.path.startsWith('/iot')) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // JWT middleware sudah handle 401
  }

  const token = authHeader.split(' ')[1];

  // Cek cache dulu
  const cached = getCached(token);
  if (cached !== null) {
    if (!cached.active) {
      return res.status(401).json({
        status: 'error',
        code: 401,
        message: 'Token sudah dicabut atau tidak aktif.',
        timestamp: new Date().toISOString(),
        service: 'api-gateway',
      });
    }
    // Inject info user dari A2 ke req.user
    // A2 payload: { userId, username, role } atau { clientId, role }
    req.user = {
      id:       cached.userId   || cached.clientId || null,
      username: cached.username || cached.clientId || null,
      role:     cached.role     || 'citizen',
      // zone_id tidak ada di A2 — default null
      zone_id:  cached.zone_id  || null,
    };
    return next();
  }

  // Panggil introspect ke A2
  try {
    const oauthUrl = process.env.OAUTH_SERVER_URL || 'http://localhost:3002';
    const response = await axios.post(
      `${oauthUrl}/oauth/introspect`,
      new URLSearchParams({ token }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 3000,
      }
    );

    const data = response.data;
    setCache(token, data);

    if (!data.active) {
      return res.status(401).json({
        status: 'error',
        code: 401,
        message: 'Token sudah dicabut atau tidak aktif.',
        timestamp: new Date().toISOString(),
        service: 'api-gateway',
      });
    }

    // Normalize payload A2 ke format standar req.user
    req.user = {
      id:       data.userId   || data.clientId || null,
      username: data.username || data.clientId || null,
      role:     data.role     || 'citizen',
      zone_id:  data.zone_id  || null,
    };

    next();
  } catch (err) {
    // Kalau OAuth Server down → fallback ke JWT lokal saja (sudah diverifikasi middleware sebelumnya)
    console.warn(`[INTROSPECT] OAuth Server tidak bisa dijangkau: ${err.message} — fallback ke JWT lokal`);
    next();
  }
}

module.exports = introspectMiddleware;
