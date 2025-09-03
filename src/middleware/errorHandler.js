const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

// Sensitive data patterns to mask in logs
const SENSITIVE_PATTERNS = [
  /password[^a-zA-Z0-9]*[:=][^,}\s]*/gi,
  /token[^a-zA-Z0-9]*[:=][^,}\s]*/gi,
  /secret[^a-zA-Z0-9]*[:=][^,}\s]*/gi,
  /key[^a-zA-Z0-9]*[:=][^,}\s]*/gi,
  /authorization[^a-zA-Z0-9]*[:=][^,}\s]*/gi,
  /bearer\s+[a-zA-Z0-9.\-_]+/gi,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
  /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, // Credit card patterns
];

// Function to sanitize sensitive data from logs
const sanitizeLogData = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    if (typeof obj === 'string') {
      return maskSensitiveString(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeLogData);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Completely remove sensitive keys
    if (['password', 'token', 'secret', 'key', 'authorization', 'refreshtoken'].includes(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      sanitized[key] = maskSensitiveString(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

// Function to mask sensitive strings
const maskSensitiveString = (str) => {
  let masked = str;
  for (const pattern of SENSITIVE_PATTERNS) {
    masked = masked.replace(pattern, (match) => {
      const parts = match.split(/[:=]/);
      if (parts.length > 1) {
        return `${parts[0]}:***`;
      }
      return '***';
    });
  }
  return masked;
};

// Custom format for production (sanitized)
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    // Sanitize all metadata
    const sanitizedMeta = sanitizeLogData(meta);
    
    // In production, limit stack traces
    if (sanitizedMeta.stack && process.env.NODE_ENV === 'production') {
      const stackLines = sanitizedMeta.stack.split('\n');
      sanitizedMeta.stack = stackLines.slice(0, 3).join('\n') + '\n... [truncated for security]';
    }
    
    const metaString = Object.keys(sanitizedMeta).length ? JSON.stringify(sanitizedMeta) : '';
    return `${timestamp} [${level}]: ${message} ${metaString}`;
  })
);

// Development format (more verbose but still sanitized)
const developmentFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const sanitizedMeta = sanitizeLogData(meta);
    const metaString = Object.keys(sanitizedMeta).length ? JSON.stringify(sanitizedMeta, null, 2) : '';
    return `${timestamp} [${level}]: ${message}\n${metaString}`;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  defaultMeta: { service: 'ethnos.app' },
  transports: [
    // Error logs com rotação diária
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    }),
    // Logs combinados com rotação
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d',
      zippedArchive: true
    }),
    // Logs de performance
    new DailyRotateFile({
      filename: 'logs/performance-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      maxSize: '10m',
      maxFiles: '3d',
      zippedArchive: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          if (meta.query_time_ms || meta.response_time) {
            return `${timestamp} [${level}] ${message} ${JSON.stringify(meta)}`;
          }
          return null;
        }),
        winston.format.splat()
      )
    })
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

const handleDatabaseError = (err) => {
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));
    return new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return new AppError('Resource already exists', 409, 'DUPLICATE_ENTRY');
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return new AppError('Referenced resource not found', 400, 'FOREIGN_KEY_ERROR');
  }

  if (err.name === 'SequelizeDatabaseError') {
    return new AppError('Database operation failed', 500, 'DATABASE_ERROR');
  }

  return err;
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    status: err.status || 'error',
    error: err,
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      code: err.code,
      timestamp: new Date().toISOString(),
    });
  } else {
    logger.error('Programming Error:', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
      timestamp: new Date().toISOString(),
    });
  }
};

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  logger.error({
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  let error = { ...err };
  error.message = err.message;

  error = handleDatabaseError(error);

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

const notFoundHandler = (req, res, next) => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404, 'NOT_FOUND');
  next(err);
};

const handleError = (res, error) => {
  logger.error('Controller Error:', {
    message: error.message,
    stack: error.stack,
    name: error.name
  });

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.message
    });
  }

  if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_TABLE_ERROR') {
    return res.status(500).json({
      error: 'Database Error',
      message: 'Table not found or database schema issue'
    });
  }

  return res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
};

module.exports = {
  AppError,
  globalErrorHandler,
  catchAsync,
  notFoundHandler,
  logger,
  handleError,
};