const { sequelize } = require('../models');
const cacheService = require('./cache.service');
const { logger } = require('../middleware/errorHandler');

class MetricsService {
  async getAnnualStats(filters = {}) {
    const { year_from, year_to, limit = 20 } = filters;
    const cacheKey = `metrics:annual:${JSON.stringify(filters)}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info('Annual stats retrieved from cache');
        return cached;
      }

      const whereConditions = [];
      const replacements = { limit: parseInt(limit) };

      if (year_from) {
        whereConditions.push('year >= :year_from');
        replacements.year_from = parseInt(year_from);
      }

      if (year_to) {
        whereConditions.push('year <= :year_to');
        replacements.year_to = parseInt(year_to);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const stats = await sequelize.query(`
        SELECT 
          year,
          total_publications,
          unique_works,
          open_access_count,
          ROUND(open_access_percentage, 2) as open_access_percentage,
          articles,
          books,
          theses,
          conference_papers,
          unique_venues,
          unique_authors,
          ROUND(avg_citations, 2) as avg_citations,
          ROUND(total_downloads, 0) as total_downloads,
          unique_organizations
        FROM v_annual_stats
        ${whereClause}
        ORDER BY year DESC
        LIMIT :limit
      `, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      const result = {
        data: stats,
        summary: {
          total_years: stats.length,
          earliest_year: stats.length > 0 ? stats[stats.length - 1].year : null,
          latest_year: stats.length > 0 ? stats[0].year : null
        }
      };

      await cacheService.set(cacheKey, result, cacheService.getTTL('statistics'));
      logger.info(`Annual stats cached: ${stats.length} years`);
      
      return result;
    } catch (error) {
      logger.error('Error fetching annual stats:', error);
      throw error;
    }
  }

  async getTopVenues(filters = {}) {
    const { limit = 20 } = filters;
    const cacheKey = `metrics:venues:${JSON.stringify(filters)}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info('Venue ranking retrieved from cache');
        return cached;
      }

      const venues = await sequelize.query(`
        SELECT 
          venue_id,
          venue_name,
          venue_type,
          total_works,
          unique_authors,
          first_publication_year,
          latest_publication_year,
          open_access_percentage,
          open_access_works
        FROM v_venue_ranking
        ORDER BY total_works DESC
        LIMIT :limit
      `, {
        replacements: { limit: parseInt(limit) },
        type: sequelize.QueryTypes.SELECT
      });

      const result = {
        data: venues,
        summary: {
          total_venues: venues.length,
          top_publications: venues.length > 0 ? venues[0].total_works : 0,
          total_authors: venues.reduce((sum, v) => sum + (v.unique_authors || 0), 0),
          avg_open_access: venues.length > 0 ? 
            Math.round(venues.reduce((sum, v) => sum + (v.open_access_percentage || 0), 0) / venues.length * 10) / 10 : 0
        }
      };

      await cacheService.set(cacheKey, result, cacheService.getTTL('statistics'));
      logger.info(`Venue ranking cached: ${venues.length} venues`);
      
      return result;
    } catch (error) {
      logger.error('Error fetching venue ranking:', error);
      throw error;
    }
  }

  async getInstitutionProductivity(filters = {}) {
    const { limit = 20, country_code } = filters;
    const cacheKey = `metrics:institutions:${JSON.stringify(filters)}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info('Institution productivity retrieved from cache');
        return cached;
      }

      const whereConditions = [];
      const replacements = { limit: parseInt(limit) };

      if (country_code) {
        whereConditions.push('country_code = :country_code');
        replacements.country_code = country_code;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const institutions = await sequelize.query(`
        SELECT 
          organization_id,
          organization_name,
          country_code,
          total_works,
          total_citations,
          ROUND(avg_citations, 2) as avg_citations,
          h_index,
          total_authors,
          open_access_works,
          ROUND(open_access_percentage, 2) as open_access_percentage,
          first_publication_year,
          latest_publication_year
        FROM v_institution_productivity
        ${whereClause}
        ORDER BY total_works DESC, total_citations DESC
        LIMIT :limit
      `, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      const result = {
        data: institutions,
        summary: {
          total_institutions: institutions.length,
          countries: [...new Set(institutions.map(i => i.country_code))].filter(Boolean),
          top_productivity: institutions.length > 0 ? institutions[0].total_works : 0
        }
      };

      await cacheService.set(cacheKey, result, cacheService.getTTL('statistics'));
      logger.info(`Institution productivity cached: ${institutions.length} institutions`);
      
      return result;
    } catch (error) {
      logger.error('Error fetching institution productivity:', error);
      throw error;
    }
  }

  async getPersonProduction(filters = {}) {
    const { limit = 20, organization_id } = filters;
    const cacheKey = `metrics:persons:${JSON.stringify(filters)}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info('Person production retrieved from cache');
        return cached;
      }

      const whereConditions = [];
      const replacements = { limit: parseInt(limit) };

      if (organization_id) {
        whereConditions.push('primary_affiliation_id = :organization_id');
        replacements.organization_id = parseInt(organization_id);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const persons = await sequelize.query(`
        SELECT 
          person_id,
          person_name,
          orcid,
          primary_affiliation_name,
          total_works,
          total_citations,
          ROUND(avg_citations, 2) as avg_citations,
          h_index,
          as_first_author,
          as_corresponding_author,
          open_access_works,
          ROUND(open_access_percentage, 2) as open_access_percentage,
          first_publication_year,
          latest_publication_year,
          collaboration_count
        FROM v_person_production
        ${whereClause}
        ORDER BY total_works DESC, total_citations DESC
        LIMIT :limit
      `, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      const result = {
        data: persons,
        summary: {
          total_persons: persons.length,
          top_productivity: persons.length > 0 ? persons[0].total_works : 0,
          top_h_index: persons.length > 0 ? Math.max(...persons.map(p => p.h_index || 0)) : 0,
          avg_collaboration: persons.length > 0 ? 
            Math.round(persons.reduce((sum, p) => sum + (p.collaboration_count || 0), 0) / persons.length) : 0
        }
      };

      await cacheService.set(cacheKey, result, cacheService.getTTL('statistics'));
      logger.info(`Person production cached: ${persons.length} persons`);
      
      return result;
    } catch (error) {
      logger.error('Error fetching person production:', error);
      throw error;
    }
  }

  async getCollaborations(filters = {}) {
    const { limit = 20, min_collaborations = 2 } = filters;
    const cacheKey = `metrics:collaborations:${JSON.stringify(filters)}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info('Collaborations retrieved from cache');
        return cached;
      }

      const collaborations = await sequelize.query(`
        SELECT 
          person1_id,
          person1_name,
          person2_id,
          person2_name,
          shared_works,
          shared_citations,
          ROUND(avg_shared_citations, 2) as avg_shared_citations,
          first_collaboration_year,
          latest_collaboration_year,
          collaboration_years
        FROM v_collaborations
        WHERE shared_works >= :min_collaborations
        ORDER BY shared_works DESC, shared_citations DESC
        LIMIT :limit
      `, {
        replacements: { 
          limit: parseInt(limit), 
          min_collaborations: parseInt(min_collaborations) 
        },
        type: sequelize.QueryTypes.SELECT
      });

      const result = {
        data: collaborations,
        summary: {
          total_collaborations: collaborations.length,
          top_shared_works: collaborations.length > 0 ? collaborations[0].shared_works : 0,
          avg_collaboration_years: collaborations.length > 0 ?
            Math.round(collaborations.reduce((sum, c) => sum + (c.collaboration_years || 1), 0) / collaborations.length) : 0
        },
        filters: {
          min_collaborations: parseInt(min_collaborations)
        }
      };

      await cacheService.set(cacheKey, result, cacheService.getTTL('statistics'));
      logger.info(`Collaborations cached: ${collaborations.length} pairs`);
      
      return result;
    } catch (error) {
      logger.error('Error fetching collaborations:', error);
      throw error;
    }
  }

  async getDashboardSummary() {
    const cacheKey = 'metrics:dashboard:summary';
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info('Dashboard summary retrieved from cache');
        return cached;
      }

      const [totalCounts, recentStats] = await Promise.all([
        sequelize.query(`
          SELECT 
            (SELECT COUNT(*) FROM works) as total_works,
            (SELECT COUNT(*) FROM persons) as total_persons,
            (SELECT COUNT(*) FROM organizations) as total_organizations,
            (SELECT COUNT(*) FROM publications) as total_publications,
            (SELECT COUNT(DISTINCT venue_id) FROM publications WHERE venue_id IS NOT NULL) as total_venues
        `, { type: sequelize.QueryTypes.SELECT }),
        
        sequelize.query(`
          SELECT 
            year,
            total_publications,
            open_access_count,
            unique_authors
          FROM v_annual_stats 
          ORDER BY year DESC 
          LIMIT 5
        `, { type: sequelize.QueryTypes.SELECT })
      ]);

      const result = {
        totals: totalCounts[0],
        recent_trends: recentStats,
        last_updated: new Date().toISOString()
      };

      await cacheService.set(cacheKey, result, cacheService.getTTL('statistics'));
      logger.info('Dashboard summary cached');
      
      return result;
    } catch (error) {
      logger.error('Error fetching dashboard summary:', error);
      throw error;
    }
  }
}

module.exports = new MetricsService();