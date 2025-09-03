const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { logger } = require('./errorHandler');

const rateLimitHandler = (req, res) => {
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    path: req.path,
    timestamp: new Date().toISOString(),
  });

  res.status(429).json({
    status: 'error',
    message: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: res.get('Retry-After'),
  });
};

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_GENERAL) || 10000,
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => {
    return req.path.startsWith('/health');
  },
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_SEARCH) || 5000,
  message: {
    status: 'error',
    message: 'Search rate limit exceeded. Please try again later.',
    code: 'SEARCH_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

const downloadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_DOWNLOAD) || 2000,
  message: {
    status: 'error',
    message: 'Download rate limit exceeded. Please try again later.',
    code: 'DOWNLOAD_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

const speedLimiter = slowDown({
  windowMs: 60 * 1000,
  delayAfter: parseInt(process.env.SLOW_DOWN_AFTER) || 5000, // Start slowing down after 5000 requests (significantly increased)
  delayMs: () => parseInt(process.env.SLOW_DOWN_DELAY) || 50, // Fixed delay function
  maxDelayMs: parseInt(process.env.SLOW_DOWN_MAX) || 1000, // Maximum delay of 1 second
  validate: { delayMs: false } // Disable deprecation warning
});

// Metrics endpoint limiter - 3000 requests per minute (significantly increased)
const metricsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_METRICS) || 3000,
  message: {
    status: 'error',
    message: 'Metrics rate limit exceeded.',
    code: 'METRICS_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Relational endpoints rate limit - 2000 requests per minute (significantly increased)
const relationalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_RELATIONAL) || 2000,
  message: {
    status: 'error',
    message: 'Relational data rate limit exceeded. Please try again later.',
    code: 'RELATIONAL_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Simple honeypot middleware (no IP blocking)
const honeypotMiddleware = (req, res, next) => {
  const honeypotPaths = ['/admin', '/user', '/config', '/internal'];
  const isHoneypot = honeypotPaths.some(path => req.path.startsWith(path));
  
  if (isHoneypot) {
    logger.warn('Honeypot triggered', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      timestamp: new Date().toISOString()
    });
    
    return res.status(404).json({
      status: 'error',
      message: 'Not found',
      code: 'NOT_FOUND'
    });
  }
  
  next();
};

module.exports = {
  // Rate limiters (increased limits, no IP blocking)
  generalLimiter,
  searchLimiter,
  downloadLimiter,
  speedLimiter,
  metricsLimiter,
  relationalLimiter,
  
  // Security middleware (no IP blocking)
  honeypotMiddleware,
};