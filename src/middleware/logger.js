/**
 * HTTP request logger middleware.
 * Records the request method, URL, final status code, and response time in milliseconds.
 * Formats the log message with ANSI color codes matching status range.
 */
export function logger(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    // Suppress verbose logging during tests to keep test reports clean
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    const statusCode = res.statusCode;

    // Determine ANSI color code based on HTTP status code category
    let color = '\x1b[0m'; // Default reset
    if (statusCode >= 500) {
      color = '\x1b[31m'; // Red (Server errors)
    } else if (statusCode >= 400) {
      color = '\x1b[33m'; // Yellow (Client errors)
    } else if (statusCode >= 300) {
      color = '\x1b[36m'; // Cyan (Redirects)
    } else if (statusCode >= 200) {
      color = '\x1b[32m'; // Green (Success)
    }

    const reset = '\x1b[0m';
    console.log(
      `${color}${req.method} ${req.originalUrl || req.url} ${statusCode} ${durationMs.toFixed(2)}ms${reset}`
    );
  });

  next();
}

export default logger;
