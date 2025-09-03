const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config({ path: '.env.test' });

const { globalErrorHandler, notFoundHandler, logger } = require('../../src/middleware/errorHandler');
const { performanceMonitoring, errorMonitoring } = require('../../src/middleware/monitoring');

const app = express();

// Basic middleware for tests (no rate limiting)
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Performance monitoring for tests
app.use(performanceMonitoring);

// Routes
const healthRoutes = require('../../src/routes/health');
const worksRoutes = require('../../src/routes/works');
const personsRoutes = require('../../src/routes/persons');
const organizationsRoutes = require('../../src/routes/organizations');
const searchRoutes = require('../../src/routes/search');
const metricsRoutes = require('../../src/routes/metrics');
const citationsRoutes = require('../../src/routes/citations');
const collaborationsRoutes = require('../../src/routes/collaborations');
const filesRoutes = require('../../src/routes/files');

// Swagger documentation
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('../../swagger.config');

app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpecs);
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "ethnos.app API - Documentation"
}));

// Apply routes without rate limiting for tests
app.use('/api/health', healthRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/works', worksRoutes);
app.use('/api/persons', personsRoutes);
app.use('/api/organizations', organizationsRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api', citationsRoutes);
app.use('/api', collaborationsRoutes);
app.use('/api', filesRoutes);

app.use('*', notFoundHandler);
app.use(errorMonitoring);
app.use(globalErrorHandler);

module.exports = app;