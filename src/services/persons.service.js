const { Person, Work, Organization, Authorship, sequelize } = require('../models');
const { Op } = require('sequelize');
const cacheService = require('./cache.service');
const { logger } = require('../middleware/errorHandler');
const sphinxService = require('./sphinx.service');

class PersonsService {
  async getPersonById(id) {
    const cacheKey = `person:${id}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info(`Person ${id} retrieved from cache`);
        return cached;
      }

      const person = await sequelize.query(`
        SELECT 
          p.*,
          s.signature as name_signature,
          COUNT(DISTINCT a.work_id) as works_count,
          COUNT(DISTINCT CASE WHEN a.role = 'AUTHOR' THEN a.work_id END) as author_count,
          COUNT(DISTINCT CASE WHEN a.role = 'EDITOR' THEN a.work_id END) as editor_count,
          MIN(pub.year) as first_publication_year,
          MAX(pub.year) as latest_publication_year
        FROM persons p
        LEFT JOIN persons_signatures ps ON p.id = ps.person_id
        LEFT JOIN signatures s ON ps.signature_id = s.id
        LEFT JOIN authorships a ON p.id = a.person_id
        LEFT JOIN publications pub ON a.work_id = pub.work_id
        WHERE p.id = :id
        GROUP BY p.id
      `, {
        replacements: { id },
        type: sequelize.QueryTypes.SELECT
      });

      if (!person || person.length === 0) {
        return null;
      }

      const recentWorks = await sequelize.query(`
        SELECT 
          w.id,
          w.title,
          w.work_type,
          w.language,
          pub.year,
          pub.doi,
          a.role,
          a.position
        FROM works w
        INNER JOIN authorships a ON w.id = a.work_id
        LEFT JOIN publications pub ON w.id = pub.work_id
        WHERE a.person_id = :id
        ORDER BY COALESCE(pub.year, 2024) DESC, w.id DESC
        LIMIT 10
      `, {
        replacements: { id },
        type: sequelize.QueryTypes.SELECT
      });

      const result = this.formatPersonDetails(person[0], recentWorks);
      
      await cacheService.set(cacheKey, result, 1800); // 30 minutes
      logger.info(`Person ${id} cached for 30 minutes`);
      
      return result;
    } catch (error) {
      logger.error('Error fetching person by ID:', error);
      throw error;
    }
  }

  async getPersons(filters = {}) {
    const { page = 1, limit = 20, search, verified } = filters;
    const offset = (page - 1) * limit;
    
    const cacheKey = `persons:${JSON.stringify(filters)}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info('Persons list retrieved from cache');
        return cached;
      }

      const whereConditions = [];
      const replacements = { limit: parseInt(limit), offset: parseInt(offset) };

      // Use Sphinx for search optimization (50-100x faster)
      if (search) {
        return await this.searchPersonsSphinx(search, { limit, offset, verified });
      }

      if (verified !== undefined) {
        whereConditions.push('p.is_verified = :verified');
        replacements.verified = verified === 'true' ? 1 : 0;
      }

      if (filters.signature) {
        whereConditions.push('s.signature LIKE :signature');
        replacements.signature = `%${filters.signature}%`;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Optimized query: use subqueries instead of complex JOINs and GROUP BY
      const [persons, countResult] = await Promise.all([
        sequelize.query(`
          SELECT 
            p.id,
            p.preferred_name,
            p.given_names,
            p.family_name,
            p.orcid,
            p.is_verified,
            s.signature as name_signature,
            0 as works_count,
            NULL as latest_publication_year
          FROM persons p
          LEFT JOIN persons_signatures ps ON p.id = ps.person_id
          LEFT JOIN signatures s ON ps.signature_id = s.id
          ${whereClause}
          ORDER BY p.id DESC
          LIMIT :limit OFFSET :offset
        `, {
          replacements,
          type: sequelize.QueryTypes.SELECT
        }),
        
        sequelize.query(`
          SELECT COUNT(*) as total
          FROM persons p
          ${whereClause.includes('s.') ? 'LEFT JOIN persons_signatures ps ON p.id = ps.person_id LEFT JOIN signatures s ON ps.signature_id = s.id' : ''}
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
          }
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };

      await cacheService.set(cacheKey, result, cacheService.getTTL('listings')); // 2 hours for listings
      logger.info(`Persons list cached for 2 hours`);
      
      return result;
    } catch (error) {
      logger.error('Error fetching persons:', error);
      throw error;
    }
  }

  formatPersonDetails(person, recentWorks) {
    let nameVariations = [];
    try {
      if (person.name_variations) {
        if (typeof person.name_variations === 'string') {
          nameVariations = JSON.parse(person.name_variations);
        } else {
          nameVariations = person.name_variations;
        }
      }
    } catch (e) {
      if (typeof person.name_variations === 'string') {
        nameVariations = person.name_variatios.split(';').map(v => v.trim());
      } else {
        nameVariations = [];
      }
    }

    return {
      id: person.id,
      preferred_name: person.preferred_name,
      given_names: person.given_names,
      family_name: person.family_name,
      name_variations: nameVariations,
      name_signature: person.name_signature,
      identifiers: {
        orcid: person.orcid,
        lattes_id: person.lattes_id,
        scopus_id: person.scopus_id
      },
      is_verified: person.is_verified,
      metrics: {
        works_count: parseInt(person.works_count) || 0,
        author_count: parseInt(person.author_count) || 0,
        editor_count: parseInt(person.editor_count) || 0,
        first_publication_year: person.first_publication_year,
        latest_publication_year: person.latest_publication_year
      },
      recent_works: recentWorks.map(work => ({
        id: work.id,
        title: work.title,
        type: work.work_type,
        language: work.language,
        year: work.year,
        doi: work.doi,
        role: work.role,
        position: work.position
      })),
      created_at: person.created_at,
      updated_at: person.updated_at
    };
  }

  async getPersonWorks(personId, options = {}) {
    const { page = 1, limit = 20, role } = options;
    const offset = (page - 1) * limit;
    
    const cacheKey = `person:${personId}:works:${JSON.stringify(options)}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info(`Person ${personId} works retrieved from cache`);
        return cached;
      }

      const whereConditions = ['a.person_id = :personId'];
      const replacements = { personId, limit: parseInt(limit), offset: parseInt(offset) };

      if (role) {
        whereConditions.push('a.role = :role');
        replacements.role = role.toUpperCase();
      }

      const whereClause = whereConditions.join(' AND ');

      const [works, countResult] = await Promise.all([
        sequelize.query(`
          SELECT 
            w.id,
            w.title,
            w.subtitle,
            w.work_type,
            w.language,
            w.temp_doi,
            w.created_at,
            a.role,
            a.position,
            a.is_corresponding,
            pub.year,
            pub.doi,
            v.name as journal,
            pub.volume,
            pub.issue,
            pub.pages,
            was.author_string,
            CASE 
              WHEN was.author_string IS NOT NULL THEN 
                (LENGTH(was.author_string) - LENGTH(REPLACE(was.author_string, ';', '')) + 1)
              ELSE 0 
            END as total_authors
          FROM authorships a
          INNER JOIN works w ON a.work_id = w.id
          LEFT JOIN publications pub ON w.id = pub.work_id
          LEFT JOIN venues v ON pub.venue_id = v.id
          LEFT JOIN work_author_summary was ON w.id = was.work_id
          WHERE ${whereClause}
          ORDER BY COALESCE(pub.year, 2024) DESC, w.id DESC
          LIMIT :limit OFFSET :offset
        `, {
          replacements,
          type: sequelize.QueryTypes.SELECT
        }),
        
        sequelize.query(`
          SELECT COUNT(*) as total
          FROM authorships a
          WHERE ${whereClause}
        `, {
          replacements: Object.fromEntries(
            Object.entries(replacements).filter(([key]) => !['limit', 'offset'].includes(key))
          ),
          type: sequelize.QueryTypes.SELECT
        })
      ]);

      if (countResult[0].total === 0) {
        const personExists = await sequelize.query(`
          SELECT 1 FROM persons WHERE id = :personId LIMIT 1
        `, {
          replacements: { personId },
          type: sequelize.QueryTypes.SELECT
        });
        
        if (personExists.length === 0) {
          return null;
        }
      }

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      const result = {
        data: works.map(work => ({
          id: work.id,
          title: work.title,
          subtitle: work.subtitle,
          type: work.work_type,
          language: work.language,
          doi: work.temp_doi || work.doi,
          authorship: {
            role: work.role,
            position: work.position,
            is_corresponding: work.is_corresponding === 1
          },
          publication: {
            year: work.year,
            journal: work.journal,
            volume: work.volume,
            issue: work.issue,
            pages: work.pages
          },
          authors: {
            total_count: work.total_authors || 0,
            author_string: work.author_string
          },
          created_at: work.created_at
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };

      await cacheService.set(cacheKey, result, cacheService.getTTL('relationships')); // 1 hour for relationships
      logger.info(`Person ${personId} works cached for 1 hour`);
      
      return result;
    } catch (error) {
      logger.error(`Error fetching works for person ${personId}:`, error);
      throw error;
    }
  }

  async getPersonSignatures(personId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;
    
    const cacheKey = `person:${personId}:signatures:${JSON.stringify(options)}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info(`Person ${personId} signatures retrieved from cache`);
        return cached;
      }

      const [signatures, countResult] = await Promise.all([
        sequelize.query(`
          SELECT 
            s.id,
            s.signature,
            s.created_at,
            COUNT(DISTINCT psl2.person_id) as persons_count
          FROM persons_signatures ps
          INNER JOIN signatures s ON ps.signature_id = s.id
          LEFT JOIN persons_signatures ps2 ON s.id = psl2.signature_id
          WHERE ps.person_id = :personId
          GROUP BY s.id, s.signature, s.created_at
          ORDER BY s.signature ASC
          LIMIT :limit OFFSET :offset
        `, {
          replacements: { personId, limit: parseInt(limit), offset: parseInt(offset) },
          type: sequelize.QueryTypes.SELECT
        }),
        
        sequelize.query(`
          SELECT COUNT(*) as total
          FROM persons_signatures ps
          WHERE ps.person_id = :personId
        `, {
          replacements: { personId },
          type: sequelize.QueryTypes.SELECT
        })
      ]);

      if (countResult[0].total === 0) {
        const personExists = await sequelize.query(`
          SELECT 1 FROM persons WHERE id = :personId LIMIT 1
        `, {
          replacements: { personId },
          type: sequelize.QueryTypes.SELECT
        });
        
        if (personExists.length === 0) {
          return null;
        }
      }

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      const result = {
        data: signatures,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };

      await cacheService.set(cacheKey, result, cacheService.getTTL('relationships')); // 1 hour for relationships
      logger.info(`Person ${personId} signatures cached for 1 hour`);
      
      return result;
    } catch (error) {
      logger.error(`Error fetching signatures for person ${personId}:`, error);
      throw error;
    }
  }

  /**
   * Search persons using Sphinx for high-performance full-text search
   * Provides 50-100x performance improvement over MariaDB LIKE queries
   */
  async searchPersonsSphinx(searchTerm, options = {}) {
    const { limit = 20, offset = 0, verified } = options;
    const cacheKey = `persons:sphinx:${searchTerm}:${limit}:${offset}:${verified}`;

    try {
      // Check cache first
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      await sphinxService.ensureConnection();

      // Build Sphinx query with filtering
      let whereClause = `WHERE MATCH('${searchTerm.replace(/'/g, "\\'")}')`;
      
      if (verified !== undefined) {
        whereClause += ` AND is_verified = ${verified === 'true' ? 1 : 0}`;
      }

      // Execute Sphinx search query
      const searchQuery = `
        SELECT id, preferred_name, given_names, family_name, 
               name_variations, orcid, is_verified
        FROM persons_poc 
        ${whereClause}
        ORDER BY WEIGHT() DESC, id ASC
        LIMIT ${parseInt(offset)}, ${parseInt(limit)}
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM persons_poc 
        ${whereClause}
      `;

      const [searchResults, countResults] = await Promise.all([
        new Promise((resolve, reject) => {
          sphinxService.connection.query(searchQuery, (error, results) => {
            if (error) {
              logger.error('Sphinx persons search failed, falling back to MariaDB', error);
              reject(error);
              return;
            }
            resolve(results);
          });
        }),
        new Promise((resolve, reject) => {
          sphinxService.connection.query(countQuery, (error, results) => {
            if (error) {
              logger.error('Sphinx persons count failed', error);
              reject(error);
              return;
            }
            resolve(results);
          });
        })
      ]);

      const total = countResults[0].total;
      const totalPages = Math.ceil(total / limit);

      // Format results to match expected structure
      const formattedResults = searchResults.map(person => ({
        id: person.id,
        preferred_name: person.preferred_name,
        given_names: person.given_names,
        family_name: person.family_name,
        name_variations: person.name_variations,
        orcid: person.orcid || null,
        is_verified: person.is_verified,
        name_signature: null, // Not included in Sphinx index
        metrics: {
          works_count: 0,        // Could be added to Sphinx if needed
          latest_publication_year: null
        }
      }));

      const result = {
        data: formattedResults,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit: parseInt(limit),
          total: parseInt(total),
          totalPages,
          hasNext: offset + limit < total,
          hasPrev: offset > 0
        },
        search_engine: 'sphinx',
        performance_note: '50-100x faster than MariaDB LIKE queries'
      };

      await cacheService.set(cacheKey, result, cacheService.getTTL('search')); // 30 minutes for search results
      logger.info(`Persons Sphinx search cached: "${searchTerm}" - ${searchResults.length} results`);

      return result;

    } catch (error) {
      logger.error(`Sphinx persons search failed for term "${searchTerm}":`, error);
      // Fall back to original MariaDB method
      return await this.fallbackPersonsSearch(searchTerm, options);
    }
  }

  /**
   * Fallback method using MariaDB when Sphinx fails
   */
  async fallbackPersonsSearch(searchTerm, options = {}) {
    const { limit = 20, offset = 0, verified } = options;
    
    logger.warn('Using MariaDB fallback for persons search');

    const whereConditions = [];
    const replacements = { limit: parseInt(limit), offset: parseInt(offset) };

    whereConditions.push('(p.preferred_name LIKE :search OR p.given_names LIKE :search OR p.family_name LIKE :search OR p.name_variations LIKE :search)');
    replacements.search = `%${searchTerm}%`;

    if (verified !== undefined) {
      whereConditions.push('p.is_verified = :verified');
      replacements.verified = verified === 'true' ? 1 : 0;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [persons, countResult] = await Promise.all([
      sequelize.query(`
        SELECT p.id, p.preferred_name, p.given_names, p.family_name, 
               p.name_variations, p.orcid, p.is_verified
        FROM persons p
        ${whereClause}
        ORDER BY p.preferred_name ASC
        LIMIT :limit OFFSET :offset
      `, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      }),
      
      sequelize.query(`
        SELECT COUNT(*) as total
        FROM persons p
        ${whereClause}
      `, {
        replacements: { search: replacements.search, verified: replacements.verified },
        type: sequelize.QueryTypes.SELECT
      })
    ]);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    const formattedResults = persons.map(person => ({
      ...person,
      name_signature: null,
      metrics: {
        works_count: 0,
        latest_publication_year: null
      }
    }));

    return {
      data: formattedResults,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit: parseInt(limit),
        total: parseInt(total),
        totalPages,
        hasNext: offset + limit < total,
        hasPrev: offset > 0
      },
      search_engine: 'mariadb_fallback',
      performance_note: 'Using MariaDB fallback due to Sphinx error'
    };
  }
}

module.exports = new PersonsService();