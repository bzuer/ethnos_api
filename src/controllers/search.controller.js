const { validationResult } = require('express-validator');
const searchService = require('../services/search.service');
const { logger } = require('../middleware/errorHandler');

class SearchController {
  async searchWorks(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Works search validation failed:', errors.array());
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: errors.array()
        });
      }

      const { q: query } = req.query;
      const filters = {
        page: req.query.page,
        limit: req.query.limit,
        type: req.query.type,
        language: req.query.language,
        year_from: req.query.year_from,
        year_to: req.query.year_to
      };

      const startTime = Date.now();
      const result = await searchService.searchWorks(query, filters);
      const queryTime = Date.now() - startTime;

      logger.info(`Works search completed: "${query}" - ${result.pagination.total} results in ${queryTime}ms`);

      res.json({
        status: 'success',
        ...result,
        meta: {
          query_time_ms: queryTime,
          search_method: 'fulltext'
        }
      });
    } catch (error) {
      logger.error('Error in works search controller:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to search works'
      });
    }
  }

  async searchPersons(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Persons search validation failed:', errors.array());
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: errors.array()
        });
      }

      const { q: query } = req.query;
      const filters = {
        page: req.query.page,
        limit: req.query.limit,
        verified: req.query.verified
      };

      const startTime = Date.now();
      const result = await searchService.searchPersons(query, filters);
      const queryTime = Date.now() - startTime;

      logger.info(`Persons search completed: "${query}" - ${result.pagination.total} results in ${queryTime}ms`);

      res.json({
        status: 'success',
        ...result,
        meta: {
          query_time_ms: queryTime,
          search_method: 'fulltext'
        }
      });
    } catch (error) {
      logger.error('Error in persons search controller:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to search persons'
      });
    }
  }

  async searchOrganizations(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Organizations search validation failed:', errors.array());
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: errors.array()
        });
      }

      const { q: query } = req.query;
      const filters = {
        page: req.query.page,
        limit: req.query.limit,
        country_code: req.query.country_code,
        type: req.query.type
      };

      const startTime = Date.now();
      const result = await searchService.searchOrganizations(query, filters);
      const queryTime = Date.now() - startTime;

      logger.info(`Organizations search completed: "${query}" - ${result.pagination.total} results in ${queryTime}ms`);

      res.json({
        status: 'success',
        ...result,
        meta: {
          query_time_ms: queryTime,
          search_method: 'like'
        }
      });
    } catch (error) {
      logger.error('Error in organizations search controller:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to search organizations'
      });
    }
  }

  async globalSearch(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Global search validation failed:', errors.array());
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: errors.array()
        });
      }

      const { q: query } = req.query;
      const filters = {
        limit: req.query.limit || 5
      };

      const startTime = Date.now();
      const result = await searchService.globalSearch(query, filters);
      const queryTime = Date.now() - startTime;

      logger.info(`Global search completed: "${query}" in ${queryTime}ms`);

      res.json({
        status: 'success',
        ...result,
        meta: {
          query_time_ms: queryTime,
          search_types: ['fulltext_works', 'fulltext_persons', 'like_organizations']
        }
      });
    } catch (error) {
      logger.error('Error in global search controller:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to perform global search'
      });
    }
  }
}

module.exports = new SearchController();