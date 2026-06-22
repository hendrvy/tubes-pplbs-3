const jwt = require('jsonwebtoken');

// Endpoint yang tidak butuh autentikasi
const PUBLIC_PATHS = [
  '/health',
  '/oauth/token',
  '/oauth/introspect',
  '/oauth/revoke',
];

function jwtMiddleware(req, res, next) {
  // Lewati endpoint publik
  if (PUBLIC_PATHS.some(path => req.path.startsWith(path))) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      code: 401,
      message: 'Token tidak ditemukan. Sertakan Authorization: Bearer <token>',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // A2 payload: { userId, username, role } untuk password grant
    //             { clientId, role } untuk client_credentials
    // Normalize ke format standar agar proxy.js bisa pakai req.user.id
    req.user = {
      id:       decoded.userId   || decoded.clientId || null,
      username: decoded.username || decoded.clientId || null,
      role:     decoded.role     || 'citizen',
      zone_id:  decoded.zone_id  || null,
      raw:      decoded,         // simpan decoded asli kalau dibutuhkan
    };
    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Token sudah kadaluarsa. Silakan login ulang.'
        : 'Token tidak valid.';

    return res.status(401).json({
      status: 'error',
      code: 401,
      message,
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
    });
  }
}

module.exports = jwtMiddleware;
