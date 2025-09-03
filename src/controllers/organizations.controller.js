const organizationsService = require('../services/organizations.service');
const { logger } = require('../middleware/errorHandler');
const { validationResult } = require('express-validator');

class OrganizationsController {
  async getOrganizationWorks(req, res, next) {
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
      const filters = {
        page: req.query.page,
        limit: req.query.limit,
        type: req.query.type,
        year_from: req.query.year_from,
        year_to: req.query.year_to,
        language: req.query.language
      };

      const result = await organizationsService.getOrganizationWorks(id, filters);
      
      if (!result) {
        return res.status(404).json({
          status: 'error',
          message: `Organization with ID ${id} not found or has no works`
        });
      }

      logger.info(`Organization ${id} works retrieved: ${result.data.length} items`);
      
      res.json({
        status: 'success',
        ...result
      });
    } catch (error) {
      logger.error(`Error retrieving works for organization ${req.params.id}:`, error);
      next(error);
    }
  }

  async getOrganization(req, res, next) {
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
      const organization = await organizationsService.getOrganizationById(id);
      
      if (!organization) {
        return res.status(404).json({
          status: 'error',
          message: `Organization with ID ${id} not found`
        });
      }

      logger.info(`Organization ${id} retrieved successfully`);
      
      res.json({
        status: 'success',
        data: organization
      });
    } catch (error) {
      logger.error(`Error retrieving organization ${req.params.id}:`, error);
      next(error);
    }
  }

  async getOrganizations(req, res, next) {
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
        country: req.query.country,
        region: req.query.region,
        type: req.query.type
      };

      const result = await organizationsService.getOrganizations(filters);
      
      logger.info(`Organizations list retrieved: ${result.data.length} items, page ${result.pagination.page}`);
      
      res.json({
        status: 'success',
        ...result
      });
    } catch (error) {
      logger.error('Error retrieving organizations list:', error);
      next(error);
    }
  }
}

module.exports = new OrganizationsController();