const isProd = process.env.NODE_ENV === 'production';

const logger = {
  info: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
  // Only emit debug/verbose output outside of production.
  debug: (...args) => { if (!isProd) console.debug(...args); },
};

module.exports = logger;
