// 404 handler
exports.notFound = (req, res, next) => {
  res.status(404).json({ message: `Not Found - ${req.originalUrl}` });
};

// global error handler
exports.errorHandler = (err, req, res, next) => {
  console.error("💥 Error:", err);

  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    message: err.message || "Server error",
  };
  
  // Add error code if available
  if (err.code) {
    response.code = err.code;
  }
  
  // Add stack trace in development only
  if (process.env.NODE_ENV === "development" && err.stack) {
    response.stack = err.stack;
  }
  
  res.status(statusCode).json(response);
};
