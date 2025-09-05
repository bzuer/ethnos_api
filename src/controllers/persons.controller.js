const personsService = require('../services/persons.service');
const { logger } = require('../middleware/errorHandler');
const { validationResult } = require('express-validator');

class PersonsController {
  async getPerson(req, res, next) {
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
      const person = await personsService.getPersonById(id);
      
      if (!person) {
        return res.status(404).json({
          status: 'error',
          message: `Person with ID ${id} not found`
        });
      }

      logger.info(`Person ${id} retrieved successfully`);
      
      res.json({
        status: 'success',
        data: person
      });
    } catch (error) {
      logger.error(`Error retrieving person ${req.params.id}:`, error);
      next(error);
    }
  }

  async getPersons(req, res, next) {
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
        affiliation: req.query.affiliation,
        country: req.query.country,
        signature: req.query.signature,
        verified: req.query.verified
      };

      const result = await personsService.getPersons(filters);
      
      logger.info(`Persons list retrieved: ${result.data.length} items, page ${result.pagination.page}`);
      
      res.json({
        status: 'success',
        ...result
      });
    } catch (error) {
      logger.error('Error retrieving persons list:', error);
      next(error);
    }
  }

  async getPersonWorks(req, res, next) {
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
      const { page = 1, limit = 20, role } = req.query;
      
      const result = await personsService.getPersonWorks(id, { page, limit, role });
      
      if (!result) {
        return res.status(404).json({
          status: 'error',
          message: `Person with ID ${id} not found`
        });
      }

      logger.info(`Person ${id} works retrieved: ${result.data.length} items`);
      
      res.json({
        status: 'success',
        ...result
      });
    } catch (error) {
      logger.error(`Error retrieving works for person ${req.params.id}:`, error);
      next(error);
    }
  }

  async getPersonSignatures(req, res, next) {
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
      const { page = 1, limit = 20 } = req.query;
      
      const result = await personsService.getPersonSignatures(id, { page, limit });
      
      if (!result) {
        return res.status(404).json({
          status: 'error',
          message: `Person with ID ${id} not found`
        });
      }

      logger.info(`Person ${id} signatures retrieved: ${result.data.length} items`);
      
      res.json({
        status: 'success',
        ...result
      });
    } catch (error) {
      logger.error(`Error retrieving signatures for person ${req.params.id}:`, error);
      next(error);
    }
  }
}

module.exports = new PersonsController();