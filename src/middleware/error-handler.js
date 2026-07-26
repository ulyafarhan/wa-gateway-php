// ponytail: centralized error handler Express
export function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    console.error(`[ERROR] ${req.method} ${req.path}: ${err.message}`);
    if (err.stack) console.error(err.stack);
  }
  res.status(status).json({
    error: (status < 500 && err.expose) ? err.message : 'Internal server error',
    code: status
  });
}

export function notFoundHandler(req, res) {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found', code: 404 });
  }
  res.status(404).json({ error: 'Not found' });
}
