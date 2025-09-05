const { sequelize } = require('../models');
const cacheService = require('./cache.service');
const { logger } = require('../middleware/errorHandler');

class CitationsService {
  async getWorkCitations(workId, filters = {}) {
    const { page = 1, limit = 20, type = 'all' } = filters;
    const offset = (page - 1) * limit;
    
    const cacheKey = `citations:${workId}:${JSON.stringify(filters)}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info(`Citations for work ${workId} retrieved from cache`);
        return cached;
      }

      // Buscar obras que citam este work (incoming citations)
      const whereConditions = ['c.cited_work_id = :workId'];
      const replacements = { workId: parseInt(workId), limit: parseInt(limit), offset: parseInt(offset) };

      if (type !== 'all' && ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'SELF'].includes(type.toUpperCase())) {
        whereConditions.push('c.citation_type = :type');
        replacements.type = type.toUpperCase();
      }

      const whereClause = whereConditions.join(' AND ');

      const [citingWorks, citedByCount] = await Promise.all([
        sequelize.query(`
          SELECT 
            c.citing_work_id,
            c.citation_type,
            c.citation_context,
            w.title as citing_work_title,
            w.work_type as citing_work_type,
            pub.year as citing_work_year,
            pub.doi as citing_work_doi,
            COUNT(DISTINCT a.person_id) as citing_work_authors_count
          FROM citations c
          INNER JOIN works w ON c.citing_work_id = w.id
          LEFT JOIN publications pub ON w.id = pub.work_id
          LEFT JOIN authorships a ON w.id = a.work_id
          WHERE ${whereClause}
          GROUP BY c.citing_work_id
          ORDER BY pub.year DESC, c.citing_work_id DESC
          LIMIT :limit OFFSET :offset
        `, {
          replacements,
          type: sequelize.QueryTypes.SELECT
        }),

        sequelize.query(`
          SELECT COUNT(*) as total
          FROM citations c
          WHERE ${whereClause}
        `, {
          replacements: Object.fromEntries(
            Object.entries(replacements).filter(([key]) => !['limit', 'offset'].includes(key))
          ),
          type: sequelize.QueryTypes.SELECT
        })
      ]);

      const total = citedByCount[0].total;
      const totalPages = Math.ceil(total / limit);

      const result = {
        work_id: parseInt(workId),
        citing_works: citingWorks.map(citation => ({
          citing_work_id: citation.citing_work_id,
          title: citation.citing_work_title,
          type: citation.citing_work_type,
          year: citation.citing_work_year,
          doi: citation.citing_work_doi,
          authors_count: parseInt(citation.citing_work_authors_count) || 0,
          citation: {
            type: citation.citation_type,
            context: citation.citation_context ? citation.citation_context.substring(0, 200) + '...' : null
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
        filters: {
          type: type
        }
      };

      await cacheService.set(cacheKey, result, 300);
      logger.info(`Citations for work ${workId} cached: ${total} citing works`);
      
      return result;
    } catch (error) {
      logger.error(`Error fetching citations for work ${workId}:`, error);
      throw error;
    }
  }

  async getWorkReferences(workId, filters = {}) {
    const { page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;
    
    const cacheKey = `references:${workId}:${JSON.stringify(filters)}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info(`References for work ${workId} retrieved from cache`);
        return cached;
      }

      // Buscar obras citadas por este work (outgoing citations)
      const [referencedWorks, referencesCount] = await Promise.all([
        sequelize.query(`
          SELECT 
            c.cited_work_id,
            c.citation_type,
            c.citation_context,
            w.title as cited_work_title,
            w.work_type as cited_work_type,
            pub.year as cited_work_year,
            pub.doi as cited_work_doi,
            COUNT(DISTINCT a.person_id) as cited_work_authors_count
          FROM citations c
          INNER JOIN works w ON c.cited_work_id = w.id
          LEFT JOIN publications pub ON w.id = pub.work_id
          LEFT JOIN authorships a ON w.id = a.work_id
          WHERE c.citing_work_id = :workId
          GROUP BY c.cited_work_id
          ORDER BY pub.year DESC, c.cited_work_id DESC
          LIMIT :limit OFFSET :offset
        `, {
          replacements: { workId: parseInt(workId), limit: parseInt(limit), offset: parseInt(offset) },
          type: sequelize.QueryTypes.SELECT
        }),

        sequelize.query(`
          SELECT COUNT(*) as total
          FROM citations c
          WHERE c.citing_work_id = :workId
        `, {
          replacements: { workId: parseInt(workId) },
          type: sequelize.QueryTypes.SELECT
        })
      ]);

      const total = referencesCount[0].total;
      const totalPages = Math.ceil(total / limit);

      const result = {
        work_id: parseInt(workId),
        referenced_works: referencedWorks.map(ref => ({
          cited_work_id: ref.cited_work_id,
          title: ref.cited_work_title,
          type: ref.cited_work_type,
          year: ref.cited_work_year,
          doi: ref.cited_work_doi,
          authors_count: parseInt(ref.cited_work_authors_count) || 0,
          citation: {
            type: ref.citation_type,
            context: ref.citation_context ? ref.citation_context.substring(0, 200) + '...' : null
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

      await cacheService.set(cacheKey, result, 300);
      logger.info(`References for work ${workId} cached: ${total} referenced works`);
      
      return result;
    } catch (error) {
      logger.error(`Error fetching references for work ${workId}:`, error);
      throw error;
    }
  }

  async getWorkMetrics(workId) {
    const cacheKey = `metrics:work:${workId}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info(`Metrics for work ${workId} retrieved from cache`);
        return cached;
      }

      const [metricsData] = await Promise.all([
        sequelize.query(`
          SELECT 
            w.id as work_id,
            w.title,
            w.work_type,
            pub.year,
            
            -- Citation metrics
            (SELECT COUNT(*) FROM citations WHERE cited_work_id = w.id) as total_citations_received,
            (SELECT COUNT(*) FROM citations WHERE citing_work_id = w.id) as total_references_made,
            (SELECT COUNT(DISTINCT citing_work_id) FROM citations WHERE cited_work_id = w.id) as unique_citing_works,
            
            -- Citation types breakdown
            (SELECT COUNT(*) FROM citations WHERE cited_work_id = w.id AND citation_type = 'POSITIVE') as positive_citations,
            (SELECT COUNT(*) FROM citations WHERE cited_work_id = w.id AND citation_type = 'NEUTRAL') as neutral_citations,
            (SELECT COUNT(*) FROM citations WHERE cited_work_id = w.id AND citation_type = 'NEGATIVE') as negative_citations,
            (SELECT COUNT(*) FROM citations WHERE cited_work_id = w.id AND citation_type = 'SELF') as self_citations,
            
            -- Temporal metrics
            (SELECT MIN(pub2.year) FROM citations c 
             JOIN works w2 ON c.citing_work_id = w2.id 
             JOIN publications pub2 ON w2.id = pub2.work_id 
             WHERE c.cited_work_id = w.id AND pub2.year IS NOT NULL) as first_citation_year,
            (SELECT MAX(pub2.year) FROM citations c 
             JOIN works w2 ON c.citing_work_id = w2.id 
             JOIN publications pub2 ON w2.id = pub2.work_id 
             WHERE c.cited_work_id = w.id AND pub2.year IS NOT NULL) as latest_citation_year
             
          FROM works w
          LEFT JOIN publications pub ON w.id = pub.work_id
          WHERE w.id = :workId
        `, {
          replacements: { workId: parseInt(workId) },
          type: sequelize.QueryTypes.SELECT
        })
      ]);

      if (!metricsData || metricsData.length === 0) {
        return null;
      }

      const metrics = metricsData[0];
      
      // Calculate impact metrics
      const citationsPerYear = metrics.year && metrics.first_citation_year ? 
        Math.max(1, new Date().getFullYear() - metrics.first_citation_year) : 1;
      
      const result = {
        work_id: parseInt(workId),
        title: metrics.title,
        type: metrics.work_type,
        publication_year: metrics.year,
        citation_metrics: {
          total_citations_received: parseInt(metrics.total_citations_received) || 0,
          total_references_made: parseInt(metrics.total_references_made) || 0,
          unique_citing_works: parseInt(metrics.unique_citing_works) || 0,
          citations_per_year: parseFloat((metrics.total_citations_received / citationsPerYear).toFixed(2)),
          citation_types: {
            positive: parseInt(metrics.positive_citations) || 0,
            neutral: parseInt(metrics.neutral_citations) || 0,
            negative: parseInt(metrics.negative_citations) || 0,
            self: parseInt(metrics.self_citations) || 0
          }
        },
        temporal_metrics: {
          first_citation_year: metrics.first_citation_year,
          latest_citation_year: metrics.latest_citation_year,
          citation_span_years: metrics.first_citation_year && metrics.latest_citation_year ? 
            metrics.latest_citation_year - metrics.first_citation_year + 1 : null
        },
        impact_indicators: {
          highly_cited: (metrics.total_citations_received || 0) > 100,
          citation_velocity: metrics.latest_citation_year === new Date().getFullYear() ? 'current' : 
                            metrics.latest_citation_year >= new Date().getFullYear() - 2 ? 'recent' : 'historical'
        }
      };

      await cacheService.set(cacheKey, result, 600);
      logger.info(`Metrics for work ${workId} cached`);
      
      return result;
    } catch (error) {
      logger.error(`Error fetching metrics for work ${workId}:`, error);
      throw error;
    }
  }

  async getCitationNetwork(workId, depth = 1) {
    const cacheKey = `network:${workId}:depth${depth}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info(`Citation network for work ${workId} retrieved from cache`);
        return cached;
      }

      // Build citation network with specified depth
      const [networkData] = await Promise.all([
        sequelize.query(`
          WITH RECURSIVE citation_network AS (
            -- Base case: direct citations
            SELECT 
              c.citing_work_id as source_work_id,
              c.cited_work_id as target_work_id,
              1 as depth,
              c.citation_type
            FROM citations c
            WHERE c.cited_work_id = :workId OR c.citing_work_id = :workId
            
            UNION ALL
            
            -- Recursive case: citations of citations (limited depth)
            SELECT 
              c.citing_work_id as source_work_id,
              c.cited_work_id as target_work_id,
              cn.depth + 1,
              c.citation_type
            FROM citations c
            INNER JOIN citation_network cn ON (c.cited_work_id = cn.source_work_id OR c.citing_work_id = cn.target_work_id)
            WHERE cn.depth < :maxDepth
          )
          SELECT 
            cn.source_work_id,
            cn.target_work_id,
            cn.depth,
            cn.citation_type,
            w1.title as source_title,
            w2.title as target_title,
            pub1.year as source_year,
            pub2.year as target_year
          FROM citation_network cn
          LEFT JOIN works w1 ON cn.source_work_id = w1.id
          LEFT JOIN works w2 ON cn.target_work_id = w2.id
          LEFT JOIN publications pub1 ON w1.id = pub1.work_id
          LEFT JOIN publications pub2 ON w2.id = pub2.work_id
          ORDER BY cn.depth, cn.source_work_id, cn.target_work_id
          LIMIT 100
        `, {
          replacements: { workId: parseInt(workId), maxDepth: parseInt(depth) },
          type: sequelize.QueryTypes.SELECT
        })
      ]);

      const result = {
        central_work_id: parseInt(workId),
        network_depth: parseInt(depth),
        nodes: {},
        edges: [],
        network_stats: {
          total_nodes: 0,
          total_edges: networkData.length,
          max_depth: Math.max(...networkData.map(d => d.depth), 0)
        }
      };

      // Process network data
      const nodeSet = new Set();
      
      networkData.forEach(edge => {
        // Add nodes
        nodeSet.add(edge.source_work_id);
        nodeSet.add(edge.target_work_id);
        
        // Add edge
        result.edges.push({
          source: edge.source_work_id,
          target: edge.target_work_id,
          depth: edge.depth,
          citation_type: edge.citation_type,
          source_year: edge.source_year,
          target_year: edge.target_year
        });
        
        // Add node details if not exists
        if (!result.nodes[edge.source_work_id]) {
          result.nodes[edge.source_work_id] = {
            id: edge.source_work_id,
            title: edge.source_title,
            year: edge.source_year,
            is_central: edge.source_work_id === parseInt(workId)
          };
        }
        
        if (!result.nodes[edge.target_work_id]) {
          result.nodes[edge.target_work_id] = {
            id: edge.target_work_id,
            title: edge.target_title,
            year: edge.target_year,
            is_central: edge.target_work_id === parseInt(workId)
          };
        }
      });

      result.network_stats.total_nodes = nodeSet.size;

      await cacheService.set(cacheKey, result, 900);
      logger.info(`Citation network for work ${workId} cached: ${result.network_stats.total_nodes} nodes, ${result.network_stats.total_edges} edges`);
      
      return result;
    } catch (error) {
      logger.error(`Error fetching citation network for work ${workId}:`, error);
      throw error;
    }
  }
}

module.exports = new CitationsService();