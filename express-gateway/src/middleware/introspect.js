const axios = require('axios');

// ── Cache hasil introspect 30 detik biar tidak spam ke A2 ────
const cache = new Map();
const CACHE_TTL_MS = 30 * 1000;

function getCached(token) {
  const entry = cache.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(token); return null; }
  return entry.result;
}
function setCache(token, result) {
  cache.set(token, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── Public paths — skip introspect ───────────────────────────
const PUBLIC_PATHS = [
  '/health', '/metrics',
  '/oauth/token', '/oauth/introspect', '/oauth/revoke',
];

// ── Respons A2 /oauth/introspect ─────────────────────────────
// active: true  → { active, userId, username, role, iat, exp }
// active: false → { active: false }
// Sumber: server.js A2 baris "return res.json({ active: true, ...decoded })"

async function introspectMiddleware(req, res, next) {
  if (PUBLIC_PATHS.some(p => req.path.startsWith(p))) return next();
  if (req.path.startsWith('/iot')) return next(); // IoT pakai client_credentials

  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) return next(); // JWT middleware sudah handle 401

  const token = authHeader.split(' ')[1];

  // Cek cache dulu
  const cached = getCached(token);
  if (cached !== null) {
    if (!cached.active) {
      return res.status(401).json({
        status: 'error', code: 401,
        message: 'Token sudah dicabut atau tidak aktif.',
        timestamp: new Date().toISOString(),
        service: 'api-gateway',
      });
    }
    // Enrichment req.user dari hasil introspect A2
    // A2 kembalikan: { active, userId, username, role, iat, exp }
    // atau untuk client_credentials: { active, clientId, role, iat, exp }
    req.user = {
      ...req.user,                          // sudah di-set oleh jwt.js
      username: cached.username || req.user.username,
      role:     cached.role     || req.user.role,
    };
    return next();
  }

  // ── Panggil POST /oauth/introspect ke A2 ─────────────────
  try {
    const oauthUrl = process.env.OAUTH_SERVER_URL || 'http://localhost:3002';
    const { data } = await axios.post(
      `${oauthUrl}/oauth/introspect`,
      new URLSearchParams({ token }),         // A2 expect urlencoded body
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 3000 }
    );

    setCache(token, data);

    if (!data.active) {
      return res.status(401).json({
        status: 'error', code: 401,
        message: 'Token sudah dicabut atau tidak aktif.',
        timestamp: new Date().toISOString(),
        service: 'api-gateway',
      });
    }

    // Enrich req.user dengan data dari A2
    req.user = {
      ...req.user,
      username: data.username || data.clientId || req.user.username,
      role:     data.role     || req.user.role,
    };

    next();
  } catch (err) {
    // A2 down → fallback ke JWT lokal saja (sudah diverifikasi jwt.js)
    console.warn(`[INTROSPECT] A2 tidak bisa dijangkau (${err.message}) — fallback JWT lokal`);
    next();
  }
}

module.exports = introspectMiddleware;
