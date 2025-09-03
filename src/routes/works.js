const express = require('express');
const router = express.Router();
const { param, query } = require('express-validator');
const worksController = require('../controllers/works.controller');
const filesController = require('../controllers/files.controller');

const validateWorkId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Work ID must be a positive integer')
];

const validateWorksQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Search term must be between 3 and 255 characters'),
  
  query('type')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Type must be between 1 and 50 characters'),
  
  query('year_from')
    .optional()
    .isInt({ min: 1000, max: 2030 })
    .withMessage('Year from must be a valid year'),
  
  query('year_to')
    .optional()
    .isInt({ min: 1000, max: 2030 })
    .withMessage('Year to must be a valid year'),
  
];

const validateFileFilters = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
    
  query('format')
    .optional()
    .isIn(['PDF', 'EPUB', 'HTML', 'XML', 'DOCX', 'TXT', 'OTHER'])
    .withMessage('Format must be one of: PDF, EPUB, HTML, XML, DOCX, TXT, OTHER')
];

/**
 * @swagger
 * /works:
 *   get:
 *     summary: Get list of academic works
 *     description: Retrieve a paginated list of academic publications including papers, books, theses, and conference proceedings. Supports filtering by various criteria.
 *     tags: [Works]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of results per page (max 100)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           minLength: 3
 *           maxLength: 255
 *         description: Search term to filter works by title or content
 *         example: machine learning
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           maxLength: 50
 *         description: Filter by work type (article, book, thesis, etc.)
 *         example: ARTICLE
 *       - in: query
 *         name: year_from
 *         schema:
 *           type: integer
 *           minimum: 1000
 *           maximum: 2030
 *         description: Filter works published from this year onwards
 *         example: 2020
 *       - in: query
 *         name: year_to
 *         schema:
 *           type: integer
 *           minimum: 1000
 *           maximum: 2030
 *         description: Filter works published up to this year
 *         example: 2023
 *       - in: query
 *         name: is_open_access
 *         schema:
 *           type: boolean
 *         description: Filter by open access availability
 *         example: true
 *     responses:
 *       200:
 *         description: List of academic works retrieved successfully
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
 *                     $ref: '#/components/schemas/Work'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 650645
 *                     totalPages:
 *                       type: integer
 *                       example: 32533
 *                     hasNext:
 *                       type: boolean
 *                       example: true
 *                     hasPrev:
 *                       type: boolean
 *                       example: false
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/RateLimitExceeded'
 *       500:
 *         description: Internal server error
 */
router.get('/', validateWorksQuery, worksController.getWorks);

/**
 * @swagger
 * /works/{id}:
 *   get:
 *     summary: Get specific academic work by ID
 *     description: Retrieve detailed information about a specific academic publication by its unique identifier.
 *     tags: [Works]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Unique identifier of the work
 *         example: 123456
 *     responses:
 *       200:
 *         description: Work details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Work'
 *       400:
 *         description: Invalid work ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Work not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/RateLimitExceeded'
 *       500:
 *         description: Internal server error
 */
router.get('/:id', validateWorkId, worksController.getWork);

/**
 * @swagger
 * /works/{id}/files:
 *   get:
 *     summary: Get files for a work
 *     description: Retrieve all files associated with a specific work, with pagination and format filtering
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Work ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [PDF, EPUB, HTML, XML, DOCX, TXT, OTHER]
 *         description: File format filter
 *     responses:
 *       200:
 *         description: Work files retrieved successfully
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
 *                       example: 12345
 *                     files:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           file_info:
 *                             type: object
 *                             properties:
 *                               hash:
 *                                 type: string
 *                               size:
 *                                 type: integer
 *                               size_mb:
 *                                 type: number
 *                               format:
 *                                 type: string
 *                               version:
 *                                 type: string
 *                               pages:
 *                                 type: integer
 *                               language:
 *                                 type: string
 *                               md5:
 *                                 type: string
 *                                 description: MD5 hash of the file
 *                           availability:
 *                             type: object
 *                             properties:
 *                               is_available:
 *                                 type: boolean
 *                               location_type:
 *                                 type: string
 *                               download_count:
 *                                 type: integer
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/:id/files', [...validateWorkId, ...validateFileFilters], filesController.getWorkFiles);

/**
 * @swagger
 * /works/{id}/bibliography:
 *   get:
 *     summary: Get work bibliography usage
 *     description: Retrieve courses where this work is used in bibliography, with instructor information
 *     tags: [Works]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Work ID
 *         example: 2684644
 *       - in: query
 *         name: reading_type
 *         schema:
 *           type: string
 *           enum: [REQUIRED, RECOMMENDED, SUPPLEMENTARY, OPTIONAL]
 *         description: Filter by reading type
 *         example: RECOMMENDED
 *       - in: query
 *         name: year_from
 *         schema:
 *           type: integer
 *           minimum: 1900
 *           maximum: 2030
 *         description: Filter courses from this year
 *         example: 2020
 *       - in: query
 *         name: year_to
 *         schema:
 *           type: integer
 *           minimum: 1900
 *           maximum: 2030
 *         description: Filter courses up to this year
 *         example: 2025
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: Work bibliography usage retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       course_id:
 *                         type: integer
 *                         example: 465
 *                       course_name:
 *                         type: string
 *                         example: "Antropologia do Parentesco"
 *                       course_year:
 *                         type: integer
 *                         example: 2025
 *                       program_id:
 *                         type: integer
 *                         example: 2
 *                       reading_type:
 *                         type: string
 *                         enum: [REQUIRED, RECOMMENDED, SUPPLEMENTARY, OPTIONAL]
 *                         example: RECOMMENDED
 *                       instructor_count:
 *                         type: integer
 *                         example: 2
 *                       instructors:
 *                         type: string
 *                         example: "João Silva; Maria Santos"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/:id/bibliography', validateWorkId, worksController.getWorkBibliography);

module.exports = router;