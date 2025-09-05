const venuesService = require('../services/venues.service');
const { validationResult } = require('express-validator');
const { logger } = require('../middleware/errorHandler');

class VenuesController {
  /**
   * @swagger
   * /venues:
   *   get:
   *     tags:
   *       - Venues
   *     summary: Get all venues with pagination and filtering
   *     description: Retrieve a paginated list of academic venues (journals, conferences, repositories, book series) with optional filtering by type and search term
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Number of venues to return per page
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *           default: 0
   *         description: Number of venues to skip
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [JOURNAL, CONFERENCE, REPOSITORY, BOOK_SERIES]
   *         description: Filter venues by type
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search term to filter venues by name
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [name, type, impact_factor, created_at, works_count]
   *           default: name
   *         description: Field to sort by
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [ASC, DESC]
   *           default: ASC
   *         description: Sort order
   *     responses:
   *       200:
   *         description: List of venues retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 venues:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: integer
   *                         description: Venue ID
   *                       name:
   *                         type: string
   *                         description: Venue name
   *                       type:
   *                         type: string
   *                         enum: [JOURNAL, CONFERENCE, REPOSITORY, BOOK_SERIES]
   *                         description: Venue type
   *                       issn:
   *                         type: string
   *                         nullable: true
   *                         description: ISSN identifier
   *                       eissn:
   *                         type: string
   *                         nullable: true
   *                         description: Electronic ISSN identifier
   *                       scopus_source_id:
   *                         type: string
   *                         nullable: true
   *                         description: Scopus source identifier
   *                       publisher_id:
   *                         type: integer
   *                         nullable: true
   *                         description: Publisher ID
   *                       publisher_name:
   *                         type: string
   *                         nullable: true
   *                         description: Publisher name
   *                       publisher_type:
   *                         type: string
   *                         nullable: true
   *                         enum: [ACADEMIC, COMMERCIAL, UNIVERSITY, SOCIETY, GOVERNMENT, OTHER]
   *                         description: Publisher type
   *                       publisher_country:
   *                         type: string
   *                         nullable: true
   *                         description: Publisher country
   *                       impact_factor:
   *                         type: number
   *                         nullable: true
   *                         description: Impact factor rating
   *                       works_count:
   *                         type: integer
   *                         description: Number of works published in this venue
   *                       created_at:
   *                         type: string
   *                         format: date-time
   *                         description: Creation timestamp
   *                       updated_at:
   *                         type: string
   *                         format: date-time
   *                         description: Last update timestamp
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     total:
   *                       type: integer
   *                       description: Total number of venues
   *                     limit:
   *                       type: integer
   *                       description: Number of venues per page
   *                     offset:
   *                       type: integer
   *                       description: Number of venues skipped
   *                     pages:
   *                       type: integer
   *                       description: Total number of pages
   *       400:
   *         description: Invalid request parameters
   *       500:
   *         description: Internal server error
   */
  async getAllVenues(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          status: 'error',
          message: 'Validation failed', 
          details: errors.array() 
        });
      }

      const {
        limit = 20,
        offset = 0,
        type,
        search,
        sortBy = 'name',
        sortOrder = 'ASC'
      } = req.query;

      const options = {
        limit: Math.min(parseInt(limit) || 20, 100),
        offset: parseInt(offset) || 0,
        type,
        search,
        sortBy,
        sortOrder
      };

      const result = await venuesService.getVenues(options);
      
      logger.info(`Retrieved ${result.venues.length} venues`, {
        endpoint: '/venues',
        options,
        total: result.pagination.total
      });

      res.json({
        status: 'success',
        data: result.venues,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error in getAllVenues:', error);
      next(error);
    }
  }

  /**
   * @swagger
   * /venues/{id}:
   *   get:
   *     tags:
   *       - Venues
   *     summary: Get venue by ID
   *     description: Retrieve detailed information about a specific venue including publication statistics
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Venue ID
   *     responses:
   *       200:
   *         description: Venue details retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 id:
   *                   type: integer
   *                   description: Venue ID
   *                 name:
   *                   type: string
   *                   description: Venue name
   *                 type:
   *                   type: string
   *                   enum: [JOURNAL, CONFERENCE, REPOSITORY, BOOK_SERIES]
   *                   description: Venue type
   *                 issn:
   *                   type: string
   *                   nullable: true
   *                   description: ISSN identifier
   *                 eissn:
   *                   type: string
   *                   nullable: true
   *                   description: Electronic ISSN identifier
   *                 scopus_source_id:
   *                   type: string
   *                   nullable: true
   *                   description: Scopus source identifier
   *                 publisher_id:
   *                   type: integer
   *                   nullable: true
   *                   description: Publisher ID
   *                 publisher_name:
   *                   type: string
   *                   nullable: true
   *                   description: Publisher name
   *                 publisher_type:
   *                   type: string
   *                   nullable: true
   *                   enum: [ACADEMIC, COMMERCIAL, UNIVERSITY, SOCIETY, GOVERNMENT, OTHER]
   *                   description: Publisher type
   *                 publisher_country:
   *                   type: string
   *                   nullable: true
   *                   description: Publisher country
   *                 publisher_website:
   *                   type: string
   *                   nullable: true
   *                   description: Publisher website
   *                 publisher_founded_year:
   *                   type: integer
   *                   nullable: true
   *                   description: Publisher founded year
   *                 impact_factor:
   *                   type: number
   *                   nullable: true
   *                   description: Impact factor rating
   *                 works_count:
   *                   type: integer
   *                   description: Total number of works published
   *                 avg_publication_year:
   *                   type: number
   *                   nullable: true
   *                   description: Average publication year
   *                 first_publication_year:
   *                   type: integer
   *                   nullable: true
   *                   description: First publication year
   *                 last_publication_year:
   *                   type: integer
   *                   nullable: true
   *                   description: Most recent publication year
   *                 created_at:
   *                   type: string
   *                   format: date-time
   *                   description: Creation timestamp
   *                 updated_at:
   *                   type: string
   *                   format: date-time
   *                   description: Last update timestamp
   *       404:
   *         description: Venue not found
   *       500:
   *         description: Internal server error
   */
  async getVenueById(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid venue ID'
        });
      }

      const { id } = req.params;

      const venue = await venuesService.getVenueById(parseInt(id));
      
      if (!venue) {
        return res.status(404).json({ 
          status: 'error',
          message: 'Venue not found' 
        });
      }

      logger.info(`Retrieved venue ${id}`, {
        endpoint: `/venues/${id}`,
        venueName: venue.name,
        worksCount: venue.works_count
      });

      res.json({
        status: 'success',
        data: venue
      });
    } catch (error) {
      logger.error(`Error in getVenueById for ID ${req.params.id}:`, error);
      next(error);
    }
  }

  /**
   * @swagger
   * /venues/{id}/publications:
   *   get:
   *     tags:
   *       - Venues
   *     summary: Get publications in a venue
   *     description: Retrieve a paginated list of publications (works with venue-specific metadata) published in a specific venue
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Venue ID
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Number of publications to return per page
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *           default: 0
   *         description: Number of publications to skip
   *       - in: query
   *         name: year
   *         schema:
   *           type: integer
   *         description: Filter publications by publication year
   *     responses:
   *       200:
   *         description: Publications retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 publications:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Publication'
   *                 pagination:
   *                   $ref: '#/components/schemas/Pagination'
   *       400:
   *         description: Invalid parameters
   *       404:
   *         description: Venue not found
   *       500:
   *         description: Internal server error
   */
  async getVenueWorks(req, res, next) {
    try {
      const { id } = req.params;
      const { limit = 20, offset = 0, year } = req.query;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ 
          status: 'error',
          message: 'Invalid venue ID' 
        });
      }

      const options = {
        limit: Math.min(parseInt(limit) || 20, 100),
        offset: parseInt(offset) || 0,
        year: year ? parseInt(year) : null
      };

      const result = await venuesService.getVenueWorks(parseInt(id), options);
      
      logger.info(`Retrieved ${result.publications.length} publications for venue ${id}`, {
        endpoint: `/venues/${id}/publications`,
        options,
        total: result.pagination.total
      });

      res.json({
        status: 'success',
        data: result.publications,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error(`Error in getVenueWorks for venue ${req.params.id}:`, error);
      next(error);
    }
  }

  /**
   * @swagger
   * /venues/statistics:
   *   get:
   *     tags:
   *       - Venues
   *     summary: Get venue statistics
   *     description: Retrieve statistical information about all venues in the database
   *     responses:
   *       200:
   *         description: Venue statistics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 total_venues:
   *                   type: integer
   *                   description: Total number of venues
   *                 journals:
   *                   type: integer
   *                   description: Number of journals
   *                 conferences:
   *                   type: integer
   *                   description: Number of conferences
   *                 repositories:
   *                   type: integer
   *                   description: Number of repositories
   *                 book_series:
   *                   type: integer
   *                   description: Number of book series
   *                 with_impact_factor:
   *                   type: integer
   *                   description: Number of venues with impact factor
   *                 avg_impact_factor:
   *                   type: number
   *                   nullable: true
   *                   description: Average impact factor
   *                 max_impact_factor:
   *                   type: number
   *                   nullable: true
   *                   description: Maximum impact factor
   *                 min_impact_factor:
   *                   type: number
   *                   nullable: true
   *                   description: Minimum impact factor
   *       500:
   *         description: Internal server error
   */
  async getVenueStatistics(req, res, next) {
    try {
      const stats = await venuesService.getVenueStatistics();
      
      logger.info('Retrieved venue statistics', {
        endpoint: '/venues/statistics',
        totalVenues: stats.total_venues
      });

      res.json({
        status: 'success',
        data: stats
      });
    } catch (error) {
      logger.error('Error in getVenueStatistics:', error);
      next(error);
    }
  }

  /**
   * @swagger
   * /venues/search:
   *   get:
   *     tags:
   *       - Venues
   *     summary: Search venues
   *     description: Search for venues by name, ISSN, or eISSN with optional type filtering
   *     parameters:
   *       - in: query
   *         name: q
   *         required: true
   *         schema:
   *           type: string
   *         description: Search term for venue name, ISSN, or eISSN
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [JOURNAL, CONFERENCE, REPOSITORY, BOOK_SERIES]
   *         description: Filter by venue type
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Number of results to return per page
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *           default: 0
   *         description: Number of results to skip
   *     responses:
   *       200:
   *         description: Search results retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 venues:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: integer
   *                         description: Venue ID
   *                       name:
   *                         type: string
   *                         description: Venue name
   *                       type:
   *                         type: string
   *                         enum: [JOURNAL, CONFERENCE, REPOSITORY, BOOK_SERIES]
   *                         description: Venue type
   *                       issn:
   *                         type: string
   *                         nullable: true
   *                         description: ISSN identifier
   *                       eissn:
   *                         type: string
   *                         nullable: true
   *                         description: Electronic ISSN identifier
   *                       scopus_source_id:
   *                         type: string
   *                         nullable: true
   *                         description: Scopus source identifier
   *                       impact_factor:
   *                         type: number
   *                         nullable: true
   *                         description: Impact factor rating
   *                       publisher_name:
   *                         type: string
   *                         nullable: true
   *                         description: Publisher name
   *                       publisher_type:
   *                         type: string
   *                         nullable: true
   *                         enum: [ACADEMIC, COMMERCIAL, UNIVERSITY, SOCIETY, GOVERNMENT, OTHER]
   *                         description: Publisher type
   *                       publisher_country:
   *                         type: string
   *                         nullable: true
   *                         description: Publisher country
   *                       works_count:
   *                         type: integer
   *                         description: Number of works published
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     total:
   *                       type: integer
   *                       description: Total number of matching venues
   *                     limit:
   *                       type: integer
   *                       description: Number of venues per page
   *                     offset:
   *                       type: integer
   *                       description: Number of venues skipped
   *                     pages:
   *                       type: integer
   *                       description: Total number of pages
   *                 searchTerm:
   *                   type: string
   *                   description: The search term used
   *       400:
   *         description: Missing or invalid search parameters
   *       500:
   *         description: Internal server error
   */
  async searchVenues(req, res, next) {
    try {
      const { q, type, limit = 20, offset = 0 } = req.query;
      
      if (!q || q.trim().length === 0) {
        return res.status(400).json({ 
          status: 'error',
          message: 'Search query (q) parameter is required' 
        });
      }

      const options = {
        limit: Math.min(parseInt(limit) || 20, 100),
        offset: parseInt(offset) || 0,
        type
      };

      const result = await venuesService.searchVenues(q.trim(), options);
      
      logger.info(`Found ${result.venues.length} venues matching search`, {
        endpoint: '/venues/search',
        searchTerm: q,
        options,
        total: result.pagination.total
      });

      res.json({
        status: 'success',
        data: result.venues,
        pagination: result.pagination,
        query: result.searchTerm
      });
    } catch (error) {
      logger.error(`Error in searchVenues for query "${req.query.q}":`, error);
      next(error);
    }
  }
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Publication:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Work ID
 *         title:
 *           type: string
 *           description: Work title
 *         subtitle:
 *           type: string
 *           nullable: true
 *           description: Work subtitle
 *         work_type:
 *           type: string
 *           description: Type of work
 *         language:
 *           type: string
 *           nullable: true
 *           description: Language of publication
 *         temp_doi:
 *           type: string
 *           nullable: true
 *           description: Temporary DOI from works table
 *         year:
 *           type: integer
 *           nullable: true
 *           description: Publication year
 *         volume:
 *           type: string
 *           nullable: true
 *           description: Volume number
 *         issue:
 *           type: string
 *           nullable: true
 *           description: Issue number
 *         pages:
 *           type: string
 *           nullable: true
 *           description: Page range
 *         doi:
 *           type: string
 *           nullable: true
 *           description: DOI from publications table
 *         open_access:
 *           type: boolean
 *           description: Open access status
 *         peer_reviewed:
 *           type: boolean
 *           description: Peer review status
 *         publication_date:
 *           type: string
 *           format: date
 *           nullable: true
 *           description: Specific publication date
 *     Pagination:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           description: Total number of items
 *         limit:
 *           type: integer
 *           description: Number of items per page
 *         offset:
 *           type: integer
 *           description: Number of items skipped
 *         pages:
 *           type: integer
 *           description: Total number of pages
 *         hasNext:
 *           type: boolean
 *           description: Whether there are more pages
 *         hasPrev:
 *           type: boolean
 *           description: Whether there are previous pages
 */

module.exports = new VenuesController();