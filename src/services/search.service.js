const { sequelize } = require('../models');
const cacheService = require('./cache.service');
const { logger } = require('../middleware/errorHandler');
const personsService = require('./persons.service');

class SearchService {
  async searchWorks(query, filters = {}) {
    const { page = 1, limit = 20, type, language, year_from, year_to } = filters;
    const offset = (page - 1) * limit;
    
    const cacheKey = `search:works:${query}:${JSON.stringify(filters)}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info('Works search retrieved from cache');
        return cached;
      }

      const whereConditions = ['MATCH(w.title, w.subtitle, w.abstract) AGAINST(:query IN NATURAL LANGUAGE MODE)'];
      const replacements = { 
        query, 
        limit: parseInt(limit), 
        offset: parseInt(offset) 
      };

      if (type) {
        whereConditions.push('w.work_type = :type');
        replacements.type = type;
      }

      if (language) {
        whereConditions.push('w.language = :language');
        replacements.language = language;
      }

      if (year_from) {
        whereConditions.push('pub.year >= :year_from');
        replacements.year_from = parseInt(year_from);
      }

      if (year_to) {
        whereConditions.push('pub.year <= :year_to');
        replacements.year_to = parseInt(year_to);
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      const [works, countResult] = await Promise.all([
        sequelize.query(`
          SELECT 
            w.id,
            w.title,
            w.subtitle,
            w.work_type,
            w.language,
            w.temp_doi,
            pub.year,
            pub.doi,
            COALESCE((LENGTH(was.author_string) - LENGTH(REPLACE(was.author_string, ';', '')) + 1), 0) as author_count,
            MATCH(w.title, w.subtitle, w.abstract) AGAINST(:query IN NATURAL LANGUAGE MODE) as relevance
          FROM works w
          LEFT JOIN publications pub ON w.id = pub.work_id
          LEFT JOIN work_author_summary was ON w.id = was.work_id
          ${whereClause}
          ORDER BY relevance DESC, COALESCE(pub.year, 2024) DESC
          LIMIT :limit OFFSET :offset
        `, {
          replacements,
          type: sequelize.QueryTypes.SELECT
        }),
        
        sequelize.query(`
          SELECT COUNT(DISTINCT w.id) as total
          FROM works w
          LEFT JOIN publications pub ON w.id = pub.work_id
          ${whereClause}
        `, {
          replacements: Object.fromEntries(
            Object.entries(replacements).filter(([key]) => !['limit', 'offset'].includes(key))
          ),
          type: sequelize.QueryTypes.SELECT
        })
      ]);

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      const result = {
        data: works.map(work => ({
          id: work.id,
          title: work.title,
          subtitle: work.subtitle,
          type: work.work_type,
          language: work.language,
          temp_doi: work.temp_doi,
          publication: {
            year: work.year,
            doi: work.doi,
          },
          author_count: parseInt(work.author_count) || 0,
          relevance: parseFloat(work.relevance).toFixed(4)
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        query,
        search_type: 'fulltext'
      };

      await cacheService.set(cacheKey, result, 300);
      logger.info(`Works search cached: "${query}" - ${total} results`);
      
      return result;
    } catch (error) {
      logger.error('Error in works search:', error);
      throw error;
    }
  }

  async searchPersons(query, filters = {}) {
    const { page = 1, limit = 20, verified, engine } = filters;
    const offset = (page - 1) * limit;
    
    // Use Sphinx search if engine=sphinx parameter is provided
    if (engine === 'sphinx') {
      try {
        const result = await personsService.searchPersonsSphinx(query, {
          limit: parseInt(limit),
          offset: parseInt(offset),
          verified
        });
        logger.info(`Persons Sphinx search completed: "${query}" - ${result.data.length} results`);
        return result;
      } catch (error) {
        logger.error('Sphinx persons search failed, falling back to MySQL:', error);
        // Fall through to MySQL search
      }
    }
    
    const cacheKey = `search:persons:${query}:${JSON.stringify(filters)}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info('Persons search retrieved from cache');
        return cached;
      }

      const whereConditions = ['MATCH(p.preferred_name, p.given_names, p.family_name) AGAINST(:query IN NATURAL LANGUAGE MODE)'];
      const replacements = { 
        query, 
        limit: parseInt(limit), 
        offset: parseInt(offset) 
      };

      if (verified !== undefined) {
        whereConditions.push('p.is_verified = :verified');
        replacements.verified = verified === 'true' ? 1 : 0;
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      const [persons, countResult] = await Promise.all([
        sequelize.query(`
          SELECT 
            p.id,
            p.preferred_name,
            p.given_names,
            p.family_name,
            p.orcid,
            p.is_verified,
            ns.signature as name_signature,
            COUNT(DISTINCT a.work_id) as works_count,
            MAX(pub.year) as latest_publication_year,
            MATCH(p.preferred_name, p.given_names, p.family_name) AGAINST(:query IN NATURAL LANGUAGE MODE) as relevance
          FROM persons p
          LEFT JOIN persons_signatures ps ON p.id = ps.person_id
          LEFT JOIN signatures s ON ps.signature_id = s.id
          LEFT JOIN authorships a ON p.id = a.person_id
          LEFT JOIN publications pub ON a.work_id = pub.work_id
          ${whereClause}
          GROUP BY p.id
          ORDER BY relevance DESC, works_count DESC
          LIMIT :limit OFFSET :offset
        `, {
          replacements,
          type: sequelize.QueryTypes.SELECT
        }),
        
        sequelize.query(`
          SELECT COUNT(DISTINCT p.id) as total
          FROM persons p
          ${whereClause}
        `, {
          replacements: Object.fromEntries(
            Object.entries(replacements).filter(([key]) => !['limit', 'offset'].includes(key))
          ),
          type: sequelize.QueryTypes.SELECT
        })
      ]);

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      const result = {
        data: persons.map(person => ({
          id: person.id,
          preferred_name: person.preferred_name,
          given_names: person.given_names,
          family_name: person.family_name,
          orcid: person.orcid,
          is_verified: person.is_verified,
          name_signature: person.name_signature,
          metrics: {
            works_count: parseInt(person.works_count) || 0,
            latest_publication_year: person.latest_publication_year
          },
          relevance: parseFloat(person.relevance).toFixed(4)
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        query,
        search_type: 'fulltext'
      };

      await cacheService.set(cacheKey, result, 300);
      logger.info(`Persons search cached: "${query}" - ${total} results`);
      
      return result;
    } catch (error) {
      logger.error('Error in persons search:', error);
      throw error;
    }
  }

  async searchOrganizations(query, filters = {}) {
    const { page = 1, limit = 20, country_code, type } = filters;
    const offset = (page - 1) * limit;
    
    const cacheKey = `search:organizations:${query}:${JSON.stringify(filters)}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info('Organizations search retrieved from cache');
        return cached;
      }

      const whereConditions = ['o.name LIKE :query'];
      const replacements = { 
        query: `%${query}%`, 
        limit: parseInt(limit), 
        offset: parseInt(offset) 
      };

      if (country_code) {
        whereConditions.push('o.country_code = :country_code');
        replacements.country_code = country_code;
      }

      if (type) {
        whereConditions.push('o.type = :type');
        replacements.type = type;
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      const [organizations, countResult] = await Promise.all([
        sequelize.query(`
          SELECT 
            o.id,
            o.name,
            o.type,
            o.country_code,
            o.city,
            COUNT(DISTINCT a.person_id) as affiliated_authors_count,
            COUNT(DISTINCT a.work_id) as works_count,
            MAX(pub.year) as latest_publication_year
          FROM organizations o
          LEFT JOIN authorships a ON o.id = a.affiliation_id
          LEFT JOIN publications pub ON a.work_id = pub.work_id
          ${whereClause}
          GROUP BY o.id, o.name, o.type, o.country_code, o.city
          ORDER BY works_count DESC, affiliated_authors_count DESC
          LIMIT :limit OFFSET :offset
        `, {
          replacements,
          type: sequelize.QueryTypes.SELECT
        }),
        
        sequelize.query(`
          SELECT COUNT(DISTINCT o.id) as total
          FROM organizations o
          ${whereClause}
        `, {
          replacements: Object.fromEntries(
            Object.entries(replacements).filter(([key]) => !['limit', 'offset'].includes(key))
          ),
          type: sequelize.QueryTypes.SELECT
        })
      ]);

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      const result = {
        data: organizations.map(org => ({
          id: org.id,
          name: org.name,
          type: org.type,
          location: {
            country_code: org.country_code,
            city: org.city
          },
          metrics: {
            affiliated_authors_count: parseInt(org.affiliated_authors_count) || 0,
            works_count: parseInt(org.works_count) || 0,
            latest_publication_year: org.latest_publication_year
          }
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        query,
        search_type: 'like'
      };

      await cacheService.set(cacheKey, result, 180);
      logger.info(`Organizations search cached: "${query}" - ${total} results`);
      
      return result;
    } catch (error) {
      logger.error('Error in organizations search:', error);
      throw error;
    }
  }

  async globalSearch(query, filters = {}) {
    const { limit = 5 } = filters;
    
    const cacheKey = `search:global:${query}:${limit}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info('Global search retrieved from cache');
        return cached;
      }

      const [works, persons, organizations] = await Promise.all([
        this.searchWorks(query, { limit }),
        this.searchPersons(query, { limit }),
        this.searchOrganizations(query, { limit })
      ]);

      const result = {
        works: {
          total: works.pagination.total,
          results: works.data.slice(0, limit)
        },
        persons: {
          total: persons.pagination.total,
          results: persons.data.slice(0, limit)
        },
        organizations: {
          total: organizations.pagination.total,
          results: organizations.data.slice(0, limit)
        },
        query,
        timestamp: new Date().toISOString()
      };

      await cacheService.set(cacheKey, result, 180);
      logger.info(`Global search cached: "${query}"`);
      
      return result;
    } catch (error) {
      logger.error('Error in global search:', error);
      throw error;
    }
  }
}

module.exports = new SearchService();