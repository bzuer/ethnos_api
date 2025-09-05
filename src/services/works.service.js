const { Work, sequelize } = require('../models');
const cacheService = require('./cache.service');
const SphinxService = require('./sphinx.service');

class WorksService {
  async getWorks(filters = {}) {
    const { page = 1, limit = 20, search } = filters;
    const offset = (page - 1) * limit;
    const effectiveLimit = Math.min(parseInt(limit), 50);
    const cacheKey = `works:p${page}:l${effectiveLimit}:s${search || 'all'}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      if (search) {
        try {
          const sphinxService = require('./sphinx.service');
          
          const sphinxResult = await sphinxService.searchWorks(search, {
            limit: effectiveLimit,
            offset: offset
          });
          
          if (sphinxResult && sphinxResult.length > 0) {
            const processedWorks = sphinxResult.map(work => ({
              id: work.id,
              title: work.title,
              subtitle: work.subtitle || null,
              type: work.work_type || 'ARTICLE',
              language: work.language || 'unknown',
              abstract: work.abstract || null,
              doi: work.doi || null,
              year: work.year || null,
              venue_name: work.venue_name || null,
              peer_reviewed: work.peer_reviewed === 1,
              author_count: work.author_string ? work.author_string.split(';').length : 0,
              authors: work.author_string ? work.author_string.split(';').map(a => a.trim()) : [],
              first_author: work.author_string ? {
                name: work.author_string.split(';')[0]?.trim()
              } : null,
              created_at: work.created_ts ? new Date(work.created_ts * 1000).toISOString() : null,
              updated_at: work.created_ts ? new Date(work.created_ts * 1000).toISOString() : null,
              search_engine: 'Sphinx'
            }));
            
            const result = {
              data: processedWorks,
              pagination: {
                page: parseInt(page),
                limit: effectiveLimit,
                total: 618000,
                hasNext: processedWorks.length === effectiveLimit,
                hasPrev: page > 1
              },
              performance: {
                engine: 'Sphinx',
                query_time: '~15ms'
              }
            };
            
            await cacheService.set(cacheKey, result, 1800);
            return result;
          }
        } catch (sphinxError) {
          console.log('Sphinx fallback to MariaDB:', sphinxError.message);
        }
      }

      const works = await sequelize.query(`
        SELECT 
          w.id,
          w.title,
          w.subtitle,
          w.work_type,
          w.language,
          w.abstract,
          w.created_at,
          w.updated_at,
          w.temp_doi,
          was.author_string,
          was.first_author_id,
          p.preferred_name as first_author_name,
          pub.doi as publication_doi,
          pub.year,
          pub.peer_reviewed,
          v.name as venue_name,
          CASE 
            WHEN was.author_string IS NOT NULL THEN 
              (LENGTH(was.author_string) - LENGTH(REPLACE(was.author_string, ';', '')) + 1)
            ELSE 0 
          END as author_count
        FROM works w
        LEFT JOIN work_author_summary was ON w.id = was.work_id
        LEFT JOIN persons p ON was.first_author_id = p.id
        LEFT JOIN publications pub ON w.id = pub.work_id
        LEFT JOIN venues v ON pub.venue_id = v.id
        ${search ? `WHERE (w.title LIKE ? OR w.abstract LIKE ? OR was.author_string LIKE ?)` : ''}
        ORDER BY w.id DESC
        LIMIT ? OFFSET ?
      `, {
        replacements: search ? 
          [`%${search}%`, `%${search}%`, `%${search}%`, effectiveLimit, offset] :
          [effectiveLimit, offset],
        type: sequelize.QueryTypes.SELECT
      });

      // Enhanced processing with complete data
      const processedWorks = works.map(work => {
        let authors = [];
        let authorCount = work.author_count || 0;
        let firstAuthor = null;

        if (work.author_string) {
          authors = work.author_string.split(';').map(a => a.trim());
          authorCount = authors.length;
        }
        
        if (work.first_author_name) {
          firstAuthor = {
            id: work.first_author_id,
            name: work.first_author_name
          };
        } else if (authors.length > 0) {
          firstAuthor = {
            name: authors[0]
          };
        }

        return {
          id: work.id,
          title: work.title,
          subtitle: work.subtitle,
          type: work.work_type || 'ARTICLE',
          language: work.language,
          abstract: work.abstract,
          doi: work.publication_doi || work.temp_doi,
          year: work.year,
          venue_name: work.venue_name,
          peer_reviewed: work.peer_reviewed === 1,
          author_count: authorCount,
          authors: authors,
          first_author: firstAuthor,
          created_at: work.created_at,
          updated_at: work.updated_at,
          search_engine: 'MariaDB'
        };
      });

      const result = {
        data: processedWorks,
        pagination: {
          page: parseInt(page),
          limit: effectiveLimit,
          total: search ? processedWorks.length : 650000, // Dynamic for search
          hasNext: processedWorks.length === effectiveLimit,
          hasPrev: page > 1
        },
        performance: {
          engine: 'MariaDB',
          query_time: search ? '~500ms' : '~25ms'
        }
      };

      await cacheService.set(cacheKey, result, 1800); // 30 min cache
      return result;

    } catch (error) {
      throw new Error(`Works query failed: ${error.message}`);
    }
  }

  async getWorkById(id) {
    const cacheKey = `work:${id}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        // Work retrieved from cache
        return cached;
      }

      // Enhanced query with all related data
      const workQuery = `
        SELECT 
          w.id,
          w.title,
          w.subtitle,
          w.work_type,
          w.language,
          w.temp_doi,
          w.abstract,
          w.created_at,
          w.updated_at,
          
          -- Publication details
          pub.id as publication_id,
          pub.year,
          pub.volume,
          pub.issue,
          pub.pages,
          pub.doi,
          pub.peer_reviewed,
          pub.publication_date,
          
          -- Venue details
          v.id as venue_id,
          v.name as venue_name,
          v.type as venue_type,
          v.issn,
          v.eissn,
          
          -- Publisher details  
          publisher.id as publisher_id,
          publisher.name as publisher_name,
          publisher.type as publisher_type,
          publisher.country as publisher_country,
          
          -- Author summary
          was.author_string,
          was.first_author_id,
          p.preferred_name as first_author_name,
          CASE 
            WHEN was.author_string IS NOT NULL THEN 
              (LENGTH(was.author_string) - LENGTH(REPLACE(was.author_string, ';', '')) + 1)
            ELSE 0 
          END as author_count
        FROM works w
        LEFT JOIN work_author_summary was ON w.id = was.work_id
        LEFT JOIN persons p ON was.first_author_id = p.id
        LEFT JOIN publications pub ON w.id = pub.work_id
        LEFT JOIN venues v ON pub.venue_id = v.id
        LEFT JOIN publishers publisher ON v.publisher_id = publisher.id
        WHERE w.id = ?
        LIMIT 1
      `;

      const [work] = await sequelize.query(workQuery, {
        replacements: [id],
        type: sequelize.QueryTypes.SELECT
      });

      if (!work) {
        return null;
      }

      // Get detailed authorship information
      const authorsQuery = `
        SELECT 
          a.person_id,
          a.role,
          a.position,
          a.affiliation_id,
          p.preferred_name,
          p.given_names,
          p.family_name,
          p.orcid,
          o.name as affiliation_name,
          o.type as affiliation_type,
          o.country_code as affiliation_country
        FROM authorships a
        LEFT JOIN persons p ON a.person_id = p.id
        LEFT JOIN organizations o ON a.affiliation_id = o.id
        WHERE a.work_id = ?
        ORDER BY a.position
      `;

      const authorsData = await sequelize.query(authorsQuery, {
        replacements: [id],
        type: sequelize.QueryTypes.SELECT
      });

      // Get comprehensive file and metric information
      const [metricsData, filesData] = await Promise.all([
        sequelize.query(`
          SELECT 
            (SELECT COUNT(*) FROM citations WHERE cited_work_id = ?) as citation_count,
            (SELECT COUNT(*) FROM files f 
             INNER JOIN publication_files pf ON f.id = pf.file_id 
             INNER JOIN publications pub ON pf.publication_id = pub.id 
             WHERE pub.work_id = ?) as file_count
        `, {
          replacements: [id, id],
          type: sequelize.QueryTypes.SELECT
        }),
        
        // Get detailed file information
        sequelize.query(`
          SELECT 
            f.id,
            f.file_hash,
            f.file_size,
            f.file_format,
            f.version,
            f.pages,
            f.language as file_language,
            f.upload_date,
            f.download_count,
            f.file_md5,
            GROUP_CONCAT(DISTINCT CONCAT(fi.identifier_type, ':', fi.value) SEPARATOR '|') as identifiers,
            GROUP_CONCAT(DISTINCT CONCAT(fl.location_type, ':', fl.location_value, ':', fl.is_primary, ':', fl.is_active) SEPARATOR '|') as locations
          FROM files f
          INNER JOIN publication_files pf ON f.id = pf.file_id
          INNER JOIN publications pub ON pf.publication_id = pub.id
          LEFT JOIN file_identifiers fi ON f.id = fi.file_id
          LEFT JOIN file_locations fl ON f.id = fl.file_id
          WHERE pub.work_id = ?
          GROUP BY f.id, f.file_hash, f.file_size, f.file_format, f.version, f.pages, f.language, f.upload_date, f.download_count, f.file_md5
          ORDER BY f.file_size DESC, f.download_count DESC
        `, {
          replacements: [id],
          type: sequelize.QueryTypes.SELECT
        })
      ]);

      const metrics = metricsData[0] || { citation_count: 0, file_count: 0 };

      // Process file data with identifiers and locations
      const processedFiles = filesData.map(file => {
        const identifiers = {};
        const locations = [];
        
        // Parse identifiers
        if (file.identifiers) {
          file.identifiers.split('|').forEach(item => {
            const [type, value] = item.split(':');
            if (type && value) {
              identifiers[type.toLowerCase()] = value;
            }
          });
        }
        
        // Parse locations
        if (file.locations) {
          file.locations.split('|').forEach(item => {
            const [type, value, isPrimary, isActive] = item.split(':');
            if (type && value) {
              locations.push({
                type: type,
                value: value,
                is_primary: isPrimary === '1',
                is_active: isActive === '1'
              });
            }
          });
        }
        
        return {
          id: file.id,
          file_hash: file.file_hash,
          file_size: file.file_size,
          file_format: file.file_format,
          version: file.version,
          pages: file.pages,
          language: file.file_language,
          upload_date: file.upload_date,
          download_count: file.download_count,
          identifiers: identifiers,
          locations: locations
        };
      });

      // Process authors using the enhanced authorship data
      let authors = [];
      let authorCount = 0;

      if (authorsData.length > 0) {
        authors = authorsData.map(author => ({
          person_id: author.person_id,
          name: author.preferred_name || `${author.given_names || ''} ${author.family_name || ''}`.trim() || 'Unknown Author',
          given_names: author.given_names,
          family_name: author.family_name,
          orcid: author.orcid,
          role: author.role,
          position: author.position,
          affiliation: author.affiliation_name ? {
            id: author.affiliation_id,
            name: author.affiliation_name,
            type: author.affiliation_type,
            country_code: author.affiliation_country
          } : null
        }));
        authorCount = authorsData.length;
      } else if (work.author_string) {
        authors = work.author_string.split(';').map(a => ({ name: a.trim() }));
        authorCount = authors.length;
      }

      const firstAuthor = authors.length > 0 ? {
        id: authors[0].person_id || work.first_author_id,
        name: authors[0].name || work.first_author_name
      } : null;

      // Enhanced work object with comprehensive data
      const enhancedWork = {
        id: work.id,
        title: work.title,
        subtitle: work.subtitle,
        work_type: work.work_type,
        language: work.language,
        abstract: work.abstract,
        
        // DOI information
        doi: work.doi || work.temp_doi,
        temp_doi: work.temp_doi,
        
        // Publication details
        publication: work.publication_id ? {
          id: work.publication_id,
          year: work.year,
          volume: work.volume,
          issue: work.issue,
          pages: work.pages,
          peer_reviewed: Boolean(work.peer_reviewed),
          publication_date: work.publication_date
        } : null,
        
        // Venue information
        venue: work.venue_id ? {
          id: work.venue_id,
          name: work.venue_name,
          type: work.venue_type,
          issn: work.issn,
          eissn: work.eissn
        } : null,
        
        // Publisher information
        publisher: work.publisher_id ? {
          id: work.publisher_id,
          name: work.publisher_name,
          type: work.publisher_type,
          country: work.publisher_country
        } : null,
        
        // Author information
        author_count: authorCount,
        authors: authors,
        first_author: firstAuthor,
        
        // Metrics
        metrics: {
          citation_count: parseInt(metrics.citation_count) || 0,
          file_count: parseInt(metrics.file_count) || 0,
          has_files: (parseInt(metrics.file_count) || 0) > 0,
          has_citations: (parseInt(metrics.citation_count) || 0) > 0
        },
        
        // File information
        files: processedFiles,
        file_summary: processedFiles.length > 0 ? {
          total_files: processedFiles.length,
          total_size: processedFiles.reduce((sum, file) => sum + (file.file_size || 0), 0),
          formats: [...new Set(processedFiles.map(f => f.file_format))],
          total_downloads: processedFiles.reduce((sum, file) => sum + (file.download_count || 0), 0),
          has_pdf: processedFiles.some(f => f.file_format === 'PDF'),
          has_epub: processedFiles.some(f => f.file_format === 'EPUB')
        } : null,
        
        // Timestamps
        created_at: work.created_at,
        updated_at: work.updated_at
      };

      await cacheService.set(cacheKey, enhancedWork, 7200);
      // Work with authors retrieved from database
      
      return enhancedWork;

    } catch (error) {
      console.error(`Error fetching work ${id}:`, error.message);
      throw error;
    }
  }

  async getWorkBibliography(workId, filters = {}) {
    const { reading_type, year_from, year_to, limit = 20, offset = 0 } = filters;
    const cacheKey = `work:${workId}:bibliography:${JSON.stringify(filters)}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      let query = `
        SELECT 
          c.id as course_id,
          c.name as course_name,
          c.year as course_year,
          c.program_id,
          cb.reading_type,
          COUNT(DISTINCT ci.canonical_person_id) as instructor_count,
          GROUP_CONCAT(DISTINCT p.preferred_name ORDER BY p.preferred_name SEPARATOR '; ') as instructors
        FROM course_bibliography cb
        JOIN courses c ON cb.course_id = c.id
        LEFT JOIN course_instructors ci ON c.id = ci.course_id
        LEFT JOIN persons p ON ci.canonical_person_id = p.id
        WHERE cb.work_id = ?
      `;

      const params = [workId];

      if (reading_type) {
        query += ' AND cb.reading_type = ?';
        params.push(reading_type);
      }

      if (year_from) {
        query += ' AND c.year >= ?';
        params.push(year_from);
      }

      if (year_to) {
        query += ' AND c.year <= ?';
        params.push(year_to);
      }

      query += `
        GROUP BY c.id, c.name, c.year, c.program_id, cb.reading_type
        ORDER BY c.year DESC, c.name ASC
        LIMIT ? OFFSET ?
      `;
      params.push(parseInt(limit), parseInt(offset));

      const { pool } = require('../config/database');
      const [bibliography] = await pool.execute(query, params);

      await cacheService.set(cacheKey, bibliography, 1800);
      return bibliography;
    } catch (error) {
      console.error('Error retrieving work bibliography:', error);
      throw error;
    }
  }
}

module.exports = new WorksService();