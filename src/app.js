const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { globalErrorHandler, notFoundHandler, logger } = require('./middleware/errorHandler');
const { performanceMonitoring, errorMonitoring } = require('./middleware/monitoring');
const { testConnection } = require('./config/database');
const { testRedisConnection } = require('./config/redis');

const realTimeIndexingService = require('./services/realTimeIndexing.service');

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "*.gravatar.com"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  
  frameguard: {
    action: 'deny'
  },
  
  noSniff: true,
  
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin"
  },
  
  dnsPrefetchControl: {
    allow: false
  },
  
  ieNoOpen: true,
  
  permittedCrossDomainPolicies: false,
  
  hidePoweredBy: true,
  
  expectCt: {
    maxAge: 86400,
    enforce: process.env.NODE_ENV === 'production',
  }
}));

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.CORS_ORIGINS ? 
      process.env.CORS_ORIGINS.split(',').map(o => o.trim()) : 
      ['http://localhost:3000', 'http://localhost:3001', 'https://ethnos.app'];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request', { origin, ip: origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400,
};

app.use(cors(corsOptions));

const { 
  generalLimiter,
  searchLimiter,
  downloadLimiter,
  speedLimiter,
  metricsLimiter,
  honeypotMiddleware
} = require('./middleware/rateLimiting');

app.use(honeypotMiddleware);

app.use('/', generalLimiter);
app.use('/', speedLimiter);

app.use(compression());

app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const { sanitizationMiddleware } = require('./middleware/sanitization');
app.use(sanitizationMiddleware);

app.use(performanceMonitoring);

app.get('/', (req, res) => {
  res.json({
    name: 'Ethnos.app Academic Bibliography API',
    version: '2.0.0',
    description: 'Public RESTful API for academic bibliographic research with 650k works, 385k researchers, 204k organizations',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    documentation: {
      swagger_ui: '/docs',
      openapi_spec: '/docs.json'
    },
    system_status: {
      database: '650,941 works indexed',
      search_engine: 'Sphinx (7-220x performance improvement)',
      cache: 'Redis with 30min TTL',
      rate_limiting: 'Active (100/min general, 20/min search)'
    },
    main_categories: {
      search_discovery: {
        description: 'Advanced search with Sphinx engine',
        endpoints: ['/search/works', '/search/sphinx', '/search/advanced', '/search/autocomplete', '/search/global']
      },
      academic_works: {
        description: 'Publications and citations analysis',
        endpoints: ['/works', '/works/{id}', '/works/{id}/citations', '/works/{id}/references', '/works/{id}/files']
      },
      researchers_authors: {
        description: 'Researcher profiles and collaboration networks',
        endpoints: ['/persons', '/persons/{id}', '/persons/{id}/collaborators', '/persons/{id}/works']
      },
      institutions: {
        description: 'Academic organizations and affiliations',
        endpoints: ['/organizations', '/organizations/{id}', '/organizations/{id}/works']
      },
      academic_venues: {
        description: 'Journals, conferences, and publication venues',
        endpoints: ['/venues', '/venues/{id}', '/venues/search', '/venues/statistics']
      },
      courses_teaching: {
        description: 'Academic courses and instructor profiles',
        endpoints: ['/courses', '/courses/{id}', '/instructors', '/instructors/{id}/statistics']
      },
      bibliography_analysis: {
        description: 'Academic bibliography and reading analysis',
        endpoints: ['/bibliography', '/bibliography/analysis', '/subjects', '/signatures']
      },
      metrics_analytics: {
        description: 'Research metrics and institutional analytics',
        endpoints: ['/metrics/dashboard', '/metrics/venues', '/metrics/sphinx', '/dashboard/overview']
      }
    },
    data_statistics: {
      total_works: '1,165,827',
      total_researchers: '549,480',
      total_organizations: '182,176',
      total_venues: '4,945',
      total_courses: '433'
    },
    technical_features: {
      search_performance: 'Sphinx: 2-4ms vs MariaDB: 450ms (221x improvement)',
      authentication: 'Not required - Public API',
      rate_limits: {
        general: '100 requests/minute',
        search: '20 requests/minute', 
        downloads: '10 requests/minute',
        metrics: '30 requests/minute',
        academic_domains: 'Expanded limits for .edu/.ac'
      },
      response_format: 'JSON with pagination {page, limit, total, totalPages, hasNext, hasPrev}',
      cache_ttl: '30 minutes',
      security: 'XSS protection, SQL injection prevention, abuse detection'
    },
    quick_examples: {
      search_works: 'GET /search/works?q=machine+learning&limit=10',
      get_work_details: 'GET /works/123456',
      search_authors: 'GET /persons?search=silva&limit=5',
      venue_metrics: 'GET /venues/1/statistics',
      system_health: 'GET /health'
    },
    support: {
      license: 'MIT License',
      website: 'https://ethnos.app',
      technical_contact: 'Bruno Cesar Cunha Cruz - PPGAS/MN/UFRJ'
    }
  });
});

const healthRoutes = require('./routes/health');
const securityRoutes = require('./routes/security');
const worksRoutes = require('./routes/works');
const personsRoutes = require('./routes/persons');
const organizationsRoutes = require('./routes/organizations');
const venuesRoutes = require('./routes/venues');
const signaturesRoutes = require('./routes/signatures');
const searchRoutes = require('./routes/search');
const metricsRoutes = require('./routes/metrics');
const citationsRoutes = require('./routes/citations');
const collaborationsRoutes = require('./routes/collaborations');
const filesRoutes = require('./routes/files');
const sphinxRoutes = require('./routes/sphinx');
const dashboardRoutes = require('./routes/dashboard');

const coursesRoutes = require('./routes/courses');
const instructorsRoutes = require('./routes/instructors');
const subjectsRoutes = require('./routes/subjects');
const bibliographyRoutes = require('./routes/bibliography');

const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('../config/swagger.config');

app.get('/docs.json', (req, res) => {
  res.set({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.send(swaggerSpecs);
});

const swaggerOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "ethnos.app API - Documentation",
  swaggerOptions: {
    url: `/docs.json?v=${Date.now()}`,
    validatorUrl: null,
  }
};

app.use('/docs', (req, res, next) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });
  next();
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, swaggerOptions));


app.use('/health', healthRoutes);

app.use('/security', metricsLimiter, securityRoutes);

app.use('/search', searchLimiter, searchRoutes);
app.use('/', searchLimiter, sphinxRoutes);
app.use('/works', worksRoutes);
app.use('/persons', personsRoutes);
app.use('/author', personsRoutes);
app.use('/authors', personsRoutes);
app.use('/organizations', organizationsRoutes);
app.use('/venues', venuesRoutes);
app.use('/signatures', signaturesRoutes);
app.use('/metrics', metricsLimiter, metricsRoutes);
app.use('/files', downloadLimiter, filesRoutes);
app.use('/dashboard', metricsLimiter, dashboardRoutes);
app.use('/', citationsRoutes);
app.use('/', collaborationsRoutes);

app.use('/courses', coursesRoutes);
app.use('/instructors', instructorsRoutes);
app.use('/subjects', subjectsRoutes);
app.use('/bibliography', bibliographyRoutes);

app.use('/works', bibliographyRoutes);

app.use('*', notFoundHandler);

app.use(errorMonitoring);
app.use(globalErrorHandler);

const PORT = process.env.PORT || 3000;

let server = null;

const startServer = async () => {
  try {
    const dbConnected = await testConnection();
    const redisConnected = await testRedisConnection();
    
    if (!dbConnected) {
      logger.warn('Database connection failed - some features may not work');
    }
    
    if (!redisConnected) {
      logger.warn('Redis connection failed - caching disabled');
    }

    const sphinxHealthCheck = require('./services/sphinxHealthCheck.service');
    await sphinxHealthCheck.startMonitoring();

    server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📚 API Bibliográfica ${process.env.NODE_ENV || 'development'} mode`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
      logger.info(`🔍 Search engine: ${process.env.SEARCH_ENGINE || 'SPHINX'} with health monitoring`);
    });

    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = typeof PORT === 'string' ? `Pipe ${PORT}` : `Port ${PORT}`;

      switch (error.code) {
        case 'EACCES':
          logger.error(`${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`${bind} is already in use`);
          process.exit(1);
          break;
        default:
          logger.error('Server error:', error);
          throw error;
      }
    });

    server.on('listening', () => {
      const addr = server.address();
      const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
      logger.info(`🎯 Server listening on ${bind}`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal) => {
  logger.info(`🔄 Received ${signal}. Starting graceful shutdown...`);
  
  if (!server) {
    logger.info('No server to close');
    process.exit(0);
  }

  server.close(async (err) => {
    if (err) {
      logger.error('Error during server shutdown:', err);
      process.exit(1);
    }

    logger.info('🔄 HTTP server closed');

    try {
      const sphinxHealthCheck = require('./services/sphinxHealthCheck.service');
      await sphinxHealthCheck.stopMonitoring();
      logger.info('🔍 Sphinx monitoring stopped');

      const { sequelize, closePool } = require('./config/database');
      await sequelize.close();
      await closePool();
      logger.info('💾 Database connections closed');

      const redis = require('./config/redis');
      if (redis && typeof redis.quit === 'function') {
        await redis.quit();
        logger.info('📝 Redis connections closed');
      }

      logger.info('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('⚠️ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));

process.on('message', (msg) => {
  if (msg === 'shutdown') {
    gracefulShutdown('PM2_SHUTDOWN');
  }
});

if (require.main === module) {
  startServer();
}

module.exports = app;