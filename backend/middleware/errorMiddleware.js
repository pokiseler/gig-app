const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  const isJsonSyntaxError = err instanceof SyntaxError && err.status === 400 && 'body' in err;

  res.status(isJsonSyntaxError ? 400 : statusCode).json({
    message: isJsonSyntaxError ? 'Invalid JSON in request body.' : err.message || 'Internal server error.',
  });
};

module.exports = {
  notFound,
  errorHandler,
};