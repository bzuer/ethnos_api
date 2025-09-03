const worksService = require('../services/works.service');
const { validationResult } = require('express-validator');

/**
 * @swagger
 * components:
 *   schemas:
 *     WorkListResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: success
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Work'
 *         pagination:
 *           $ref: '#/components/schemas/Pagination'
 *     WorkDetailResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: success
 *         data:
 *           $ref: '#/components/schemas/Work'
 */
class WorksController {
  /**
   * @swagger
   * /works/{id}:
   *   get:
   *     tags: [Works]
   *     summary: Get work by ID
   *     description: Retrieve detailed information about a specific academic work including authors, publication details, and metadata
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *           minimum: 1
   *         description: Work ID
   *         example: 123456
   *     responses:
   *       200:
   *         description: Work details retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/WorkDetailResponse'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  async getWork(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const work = await worksService.getWorkById(id);
      
      if (!work) {
        return res.status(404).json({
          status: 'error',
          message: `Work with ID ${id} not found`
        });
      }

      
      res.json({
        status: 'success',
        data: work
      });
    } catch (error) {
      console.error(`Error retrieving work ${req.params.id}:`, error.message);
      next(error);
    }
  }

  /**
   * @swagger
   * /works:
   *   get:
   *     tags: [Works]
   *     summary: Get list of academic works
   *     description: Retrieve a paginated list of academic works with filtering and sorting options
   *     parameters:
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
   *         description: Number of results per page
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [ARTICLE, BOOK, CHAPTER, THESIS, CONFERENCE, REPORT, DATASET, OTHER]
   *         description: Filter by work type
   *       - in: query
   *         name: language
   *         schema:
   *           type: string
   *         description: Filter by language (ISO 639 code)
   *       - in: query
   *         name: year_from
   *         schema:
   *           type: integer
   *           minimum: 1900
   *           maximum: 2030
   *         description: Filter by minimum publication year
   *       - in: query
   *         name: year_to
   *         schema:
   *           type: integer
   *           minimum: 1900
   *           maximum: 2030
   *         description: Filter by maximum publication year
   *       - in: query
   *         name: open_access
   *         schema:
   *           type: boolean
   *         description: Filter by open access availability
   *     responses:
   *       200:
   *         description: Works retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/WorkListResponse'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  async getWorks(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const filters = {
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        type: req.query.type,
        year_from: req.query.year_from,
        year_to: req.query.year_to,
        // is_open_access removed
      };

      const result = await worksService.getWorks(filters);
      
      res.json({
        status: 'success',
        ...result
      });
    } catch (error) {
      console.error('Error retrieving works list:', error.message);
      next(error);
    }
  }

  async getWorkBibliography(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid parameters',
          errors: errors.array()
        });
      }

      const id = parseInt(req.params.id);
      const filters = {
        reading_type: req.query.reading_type,
        year_from: req.query.year_from,
        year_to: req.query.year_to,
        limit: req.query.limit || 20,
        offset: req.query.offset || 0
      };

      const bibliography = await worksService.getWorkBibliography(id, filters);
      res.json({
        status: 'success',
        data: bibliography
      });
    } catch (error) {
      console.error('Error retrieving work bibliography:', error.message);
      next(error);
    }
  }
}

module.exports = new WorksController();