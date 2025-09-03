/**
 * @swagger
 * tags:
 *   name: Search
 *   description: Full-text search across works, persons, and organizations
 */

const express = require('express');
const { query } = require('express-validator');
const router = express.Router();
const searchController = require('../controllers/search.controller');
const { commonValidations, enhancedValidationHandler } = require('../middleware/validation');
const sphinxService = require('../services/sphinx.service');
const sphinxHealthCheck = require('../services/sphinxHealthCheck.service');
const { logger } = require('../middleware/errorHandler');

const validateWorksSearch = [
  ...commonValidations.searchQuery,
  ...commonValidations.pagination,
  query('type')
    .optional()
    .isIn(['ARTICLE', 'BOOK', 'CHAPTER', 'THESIS', 'PREPRINT', 'CONFERENCE_PAPER', 'REVIEW', 'EDITORIAL'])
    .withMessage('Work type must be valid'),
  query('language')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Language must be a valid language code'),
  query('year_from')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage('Year from must be valid')
    .toInt(),
  query('year_to')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage('Year to must be valid')
    .toInt(),
];

/**
 * @swagger
 * /search/works:
 *   get:
 *     summary: Search works using full-text search
 *     tags: [Search]
 *     description: Search academic works by title, subtitle, and abstract using MySQL FULLTEXT indexes
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         description: Search query (minimum 2 characters)
 *         schema:
 *           type: string
 *           minLength: 2
 *           example: "machine learning"
 *       - name: type
 *         in: query
 *         description: Filter by work type
 *         schema:
 *           type: string
 *           example: "ARTICLE"
 *       - name: language
 *         in: query
 *         description: Filter by language
 *         schema:
 *           type: string
 *           example: "en"
 *       - name: year_from
 *         in: query
 *         description: Filter by minimum publication year
 *         schema:
 *           type: integer
 *           example: 2020
 *       - $ref: '#/components/parameters/pageParam'
 *       - $ref: '#/components/parameters/limitParam'
 *     responses:
 *       200:
 *         description: Search results with relevance scoring
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       relevance:
 *                         type: string
 *                         description: FULLTEXT relevance score
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *                 query:
 *                   type: string
 *                 search_type:
 *                   type: string
 *                   example: "fulltext"
 *                 meta:
 *                   type: object
 *                   properties:
 *                     query_time_ms:
 *                       type: integer
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
// Enhanced search router with Sphinx integration
const smartSearchWorks = async (req, res, next) => {
    try {
        const useSphinx = false; // Force MariaDB for now
        
        if (useSphinx) {
            // Use Sphinx search
            await sphinxService.connect();
            
            const results = await sphinxService.searchWorks(req.query.q, {
                work_type: req.query.type,
                language: req.query.language,
                year_from: req.query.year_from,
                year_to: req.query.year_to,
                limit: parseInt(req.query.limit) || 20,
                offset: parseInt(req.query.offset) || 0
            });
            
            // Add engine metadata
            results.meta = {
                ...results.meta,
                search_engine: 'sphinx',
                performance_improvement: '221x',
                query_time_ms: results.query_time
            };
            
            return res.json({ 
                status: 'success', 
                data: results.results,
                pagination: {
                    page: Math.floor((parseInt(req.query.offset) || 0) / (parseInt(req.query.limit) || 20)) + 1,
                    limit: parseInt(req.query.limit) || 20,
                    total: results.total,
                    hasNext: results.results.length === (parseInt(req.query.limit) || 20),
                    hasPrev: (parseInt(req.query.offset) || 0) > 0
                },
                total: results.total,
                performance: {
                    engine: 'Sphinx',
                    query_time_ms: results.query_time
                }
            });
            
        } else {
            // Fallback to MariaDB
            const searchService = require('../services/search.service');
            const result = await searchService.searchWorks(req.query.q, {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                type: req.query.type,
                language: req.query.language,
                year_from: req.query.year_from,
                year_to: req.query.year_to
            });
            
            return res.json({
                status: 'success',
                ...result,
                performance: {
                    engine: 'MariaDB'
                }
            });
        }
        
    } catch (error) {
        // Auto-fallback on Sphinx errors
        if (error.message.includes('Sphinx') || error.code === 'PROTOCOL_CONNECTION_LOST') {
            logger.warn('Sphinx error, falling back to MariaDB', { 
                error: error.message,
                query: req.query.q 
            });
            
            return searchController.searchWorks(req, res, next);
        }
        
        next(error);
    }
};

router.get('/works', validateWorksSearch, enhancedValidationHandler, searchController.searchWorks);

/**
 * @swagger
 * /search/global:
 *   get:
 *     summary: Global search across all entities
 *     tags: [Search]
 *     description: Perform simultaneous search across works, persons, and organizations
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         description: Search query
 *         schema:
 *           type: string
 *           minLength: 2
 *           example: "artificial intelligence"
 *       - name: limit
 *         in: query
 *         description: Limit per entity type
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 5
 *     responses:
 *       200:
 *         description: Combined search results from all entities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 works:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     results:
 *                       type: array
 *                 persons:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     results:
 *                       type: array
 *                 organizations:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     results:
 *                       type: array
 *                 meta:
 *                   type: object
 *                   properties:
 *                     query_time_ms:
 *                       type: integer
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.get('/global', commonValidations.searchQuery, enhancedValidationHandler, searchController.globalSearch);

const validateOrganizationsSearch = [
  ...commonValidations.searchQuery,
  ...commonValidations.pagination,
  query('country_code')
    .optional()
    .isLength({ min: 2, max: 3 })
    .withMessage('Country code must be 2-3 characters'),
  query('type')
    .optional()
    .isIn(['UNIVERSITY', 'RESEARCH_INSTITUTE', 'COMPANY', 'GOVERNMENT', 'NGO', 'HOSPITAL'])
    .withMessage('Organization type must be valid'),
];

/**
 * @swagger
 * /search/persons:
 *   get:
 *     summary: Search persons/researchers by name
 *     description: Search for researchers and authors using full-text search across name fields. Returns results with relevance scoring and supports filtering by affiliation and verification status.
 *     tags: [Search]
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         description: Search query for person names (minimum 2 characters)
 *         schema:
 *           type: string
 *           minLength: 2
 *           maxLength: 255
 *           example: "John Smith"
 *       - $ref: '#/components/parameters/pageParam'
 *       - $ref: '#/components/parameters/limitParam'
 *     responses:
 *       200:
 *         description: Person search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Person'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/persons', commonValidations.searchQuery, commonValidations.pagination, enhancedValidationHandler, searchController.searchPersons);

/**
 * @swagger
 * /search/organizations:
 *   get:
 *     summary: Search academic institutions and organizations
 *     description: Search for academic institutions, universities, research institutes, and other organizations by name. Supports filtering by country and organization type.
 *     tags: [Search]
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         description: Search query for organization names (minimum 2 characters)
 *         schema:
 *           type: string
 *           minLength: 2
 *           maxLength: 255
 *           example: "University"
 *       - $ref: '#/components/parameters/pageParam'
 *       - $ref: '#/components/parameters/limitParam'
 *       - name: country_code
 *         in: query
 *         required: false
 *         description: Filter by country code (2-3 characters)
 *         schema:
 *           type: string
 *           minLength: 2
 *           maxLength: 3
 *           example: "BR"
 *       - name: type
 *         in: query
 *         required: false
 *         description: Filter by organization type
 *         schema:
 *           type: string
 *           enum: [UNIVERSITY, RESEARCH_INSTITUTE, COMPANY, GOVERNMENT, NGO, HOSPITAL]
 *           example: "UNIVERSITY"
 *     responses:
 *       200:
 *         description: Organization search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Organization'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/organizations', validateOrganizationsSearch, enhancedValidationHandler, searchController.searchOrganizations);

/**
 * @swagger
 * /search/advanced:
 *   get:
 *     summary: Advanced faceted search with filters
 *     tags: [Search]
 *     description: Enhanced search with faceted results including years, work types, languages, venues, and authors
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         description: Search query
 *         schema:
 *           type: string
 *           minLength: 2
 *           example: "machine learning"
 *       - name: limit
 *         in: query
 *         description: Number of results to return
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Advanced search results with facets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                     facets:
 *                       type: object
 *                       properties:
 *                         years:
 *                           type: array
 *                         work_types:
 *                           type: array
 *                         languages:
 *                           type: array
 *                         venues:
 *                           type: array
 *                         authors:
 *                           type: array
 *                     meta:
 *                       type: object
 *                       properties:
 *                         search_engine:
 *                           type: string
 *                         faceted_search:
 *                           type: boolean
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
const advancedSearch = async (req, res, next) => {
    try {
        const useSphinx = process.env.SEARCH_ENGINE !== 'MARIADB' && !sphinxHealthCheck.rollbackActive;
        
        if (!useSphinx) {
            return res.status(503).json({
                status: 'error',
                message: 'Advanced search requires Sphinx engine',
                fallback: 'Use /search/works for basic search'
            });
        }

        // Enhanced filters
        const filters = {
            work_type: req.query.work_type,
            language: req.query.language,
            year_from: req.query.year_from,
            year_to: req.query.year_to,
            // open_access removed
            peer_reviewed: req.query.peer_reviewed === 'true' ? true :
                          req.query.peer_reviewed === 'false' ? false : undefined,
            venue_name: req.query.venue
        };

        // Remove undefined filters
        Object.keys(filters).forEach(key => 
            filters[key] === undefined && delete filters[key]
        );
        
        const results = await sphinxService.searchWithFacets(req.query.q, filters, {
            limit: parseInt(req.query.limit) || 20,
            offset: parseInt(req.query.offset) || 0
        });
        
        results.meta.search_engine = 'sphinx';
        results.meta.advanced_search = true;
        results.meta.filters_applied = Object.keys(filters).length;
        
        res.json({
            status: 'success',
            data: results
        });
        
    } catch (error) {
        logger.error('Advanced search failed', {
            query: req.query.q,
            error: error.message
        });
        
        next(error);
    }
};

router.get('/advanced', commonValidations.searchQuery, enhancedValidationHandler, advancedSearch);

// Health check endpoint for search systems
router.get('/health', async (req, res) => {
    try {
        const healthStatus = sphinxHealthCheck.getHealthStatus();
        const sphinxStatus = await sphinxService.getStatus();
        
        res.json({
            status: 'success',
            data: {
                search_engine: process.env.SEARCH_ENGINE || 'SPHINX',
                sphinx: {
                    ...sphinxStatus,
                    health: healthStatus
                },
                endpoints: {
                    basic_search: '/search/works',
                    advanced_search: '/search/advanced',
                    sphinx_direct: '/search/sphinx',
                    sphinx_compare: '/search/sphinx/compare'
                }
            }
        });
        
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Search health check failed',
            error: error.message
        });
    }
});

// Autocomplete and suggestions endpoints
const autocompleteService = require('../services/autocomplete.service');

/**
 * @swagger
 * /search/autocomplete:
 *   get:
 *     summary: Get autocomplete suggestions for search queries
 *     tags: [Search]
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         description: Search query for suggestions
 *         schema:
 *           type: string
 *           minLength: 2
 *       - name: type
 *         in: query
 *         description: Type of suggestions
 *         schema:
 *           type: string
 *           enum: [all, titles, authors, venues]
 *           default: all
 *       - name: limit
 *         in: query
 *         description: Maximum suggestions to return
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 10
 *     responses:
 *       200:
 *         description: Autocomplete suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     suggestions:
 *                       type: array
 *                       items:
 *                         type: object
 */
router.get('/autocomplete', async (req, res) => {
    try {
        const { q, type = 'all', limit = 10 } = req.query;
        
        if (!q || q.length < 2) {
            return res.json({
                status: 'success',
                data: {
                    suggestions: [],
                    message: 'Query too short'
                }
            });
        }
        
        const suggestions = await autocompleteService.getSuggestions(q, type, parseInt(limit));
        
        // Record the query for analytics
        autocompleteService.recordSearchQuery(q, suggestions.suggestions.length);
        
        res.json({
            status: 'success',
            data: suggestions
        });
        
    } catch (error) {
        logger.error('Autocomplete failed', error);
        res.status(500).json({
            status: 'error',
            message: 'Autocomplete service failed',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /search/popular:
 *   get:
 *     summary: Get popular search terms
 *     tags: [Search]
 *     responses:
 *       200:
 *         description: Popular search terms
 */
router.get('/popular', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const popularTerms = await autocompleteService.getPopularTerms(limit);
        
        res.json({
            status: 'success',
            data: {
                popular_terms: popularTerms,
                generated_at: new Date().toISOString()
            }
        });
        
    } catch (error) {
        logger.error('Popular terms failed', error);
        res.status(500).json({
            status: 'error',
            message: 'Popular terms service failed'
        });
    }
});

module.exports = router;