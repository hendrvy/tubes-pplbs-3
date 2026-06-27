export function notFoundHandler(req, res) {
  res.status(404).json({ error: "not_found", message: `Route ${req.method} ${req.path} not found` });
}

export function errorHandler(error, req, res, _next) {
  console.error("Unhandled error:", error.message);
  const status = error.status || 500;
  res.status(status).json({
    error: error.code || "internal_error",
    message: status === 500 ? "Internal server error" : error.message,
  });
}
