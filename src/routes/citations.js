/**
 * @swagger
 * tags:
 *   name: Citations
 *   description: Citation analysis and bibliometric relationships
 */

const express = require('express');
const router = express.Router();
const { param, query } = require('express-validator');
const citationsController = require('../controllers/citations.controller');

const validateWorkId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Work ID must be a positive integer')
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const validateCitationType = [
  query('type')
    .optional()
    .isIn(['all', 'POSITIVE', 'NEUTRAL', 'NEGATIVE', 'SELF'])
    .withMessage('Type must be one of: all, POSITIVE, NEUTRAL, NEGATIVE, SELF')
];

const validateNetworkDepth = [
  query('depth')
    .optional()
    .isInt({ min: 1, max: 3 })
    .withMessage('Depth must be between 1 and 3')
];

/**
 * @swagger
 * /works/{id}/citations:
 *   get:
 *     summary: Get works that cite this work
 *     tags: [Citations]
 *     description: Retrieve all works that cite the specified work with citation context and metrics
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Work ID
 *         schema:
 *           type: integer
 *           example: 1
 *       - name: type
 *         in: query
 *         description: Filter by citation type
 *         schema:
 *           type: string
 *           enum: [all, POSITIVE, NEUTRAL, NEGATIVE, SELF]
 *           default: all
 *       - $ref: '#/components/parameters/pageParam'
 *       - $ref: '#/components/parameters/limitParam'
 *     responses:
 *       200:
 *         description: Citations retrieved successfully
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
 *                     work_id:
 *                       type: integer
 *                     citing_works:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           citing_work_id:
 *                             type: integer
 *                           title:
 *                             type: string
 *                           year:
 *                             type: integer
 *                           citation:
 *                             type: object
 *                             properties:
 *                               type:
 *                                 type: string
 *                               context:
 *                                 type: string
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/works/:id/citations', [...validateWorkId, ...validatePagination, ...validateCitationType], citationsController.getWorkCitations);

/**
 * @swagger
 * /works/{id}/references:
 *   get:
 *     summary: Get works referenced by this work
 *     tags: [Citations]
 *     description: Retrieve all works referenced/cited by the specified work
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Work ID
 *         schema:
 *           type: integer
 *           example: 1
 *       - $ref: '#/components/parameters/pageParam'
 *       - $ref: '#/components/parameters/limitParam'
 *     responses:
 *       200:
 *         description: References retrieved successfully
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
 *                     work_id:
 *                       type: integer
 *                     referenced_works:
 *                       type: array
 *                       items:
 *                         type: object
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/works/:id/references', [...validateWorkId, ...validatePagination], citationsController.getWorkReferences);

/**
 * @swagger
 * /works/{id}/metrics:
 *   get:
 *     summary: Get bibliometric metrics for a work
 *     tags: [Citations]
 *     description: Retrieve comprehensive citation metrics and impact indicators
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Work ID
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Metrics retrieved successfully
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
 *                     work_id:
 *                       type: integer
 *                     title:
 *                       type: string
 *                     citation_metrics:
 *                       type: object
 *                       properties:
 *                         total_citations_received:
 *                           type: integer
 *                         total_references_made:
 *                           type: integer
 *                         unique_citing_works:
 *                           type: integer
 *                         citations_per_year:
 *                           type: number
 *                     temporal_metrics:
 *                       type: object
 *                       properties:
 *                         first_citation_year:
 *                           type: integer
 *                         latest_citation_year:
 *                           type: integer
 *                     impact_indicators:
 *                       type: object
 *                       properties:
 *                         highly_cited:
 *                           type: boolean
 *                         citation_velocity:
 *                           type: string
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/works/:id/metrics', validateWorkId, citationsController.getWorkMetrics);

/**
 * @swagger
 * /works/{id}/network:
 *   get:
 *     summary: Get citation network for a work
 *     tags: [Citations]
 *     description: Build citation network showing relationships between works
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Work ID
 *         schema:
 *           type: integer
 *           example: 1
 *       - name: depth
 *         in: query
 *         description: Network depth (1-3 levels)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 3
 *           default: 1
 *     responses:
 *       200:
 *         description: Citation network retrieved successfully
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
 *                     central_work_id:
 *                       type: integer
 *                     network_depth:
 *                       type: integer
 *                     nodes:
 *                       type: object
 *                     edges:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           source:
 *                             type: integer
 *                           target:
 *                             type: integer
 *                           citation_type:
 *                             type: string
 *                     network_stats:
 *                       type: object
 *                       properties:
 *                         total_nodes:
 *                           type: integer
 *                         total_edges:
 *                           type: integer
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/works/:id/network', [...validateWorkId, ...validateNetworkDepth], citationsController.getCitationNetwork);

module.exports = router;