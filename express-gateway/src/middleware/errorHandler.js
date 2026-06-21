function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${new Date().toISOString()} - ${err.message}`);

  // Proxy / upstream error
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(502).json({
      status: 'error',
      code: 502,
      message: 'Service upstream tidak dapat dijangkau.',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
    });
  }

  // Timeout
  if (err.code === 'ETIMEDOUT') {
    return res.status(503).json({
      status: 'error',
      code: 503,
      message: 'Request ke service upstream timeout.',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
    });
  }

  // Default 500
  res.status(err.status || 500).json({
    status: 'error',
    code: err.status || 500,
    message: err.message || 'Internal server error.',
    timestamp: new Date().toISOString(),
    service: 'api-gateway',
  });
}

module.exports = errorHandler;
