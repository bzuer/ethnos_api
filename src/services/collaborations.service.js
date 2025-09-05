const { sequelize } = require('../models');
const cacheService = require('./cache.service');
const { logger } = require('../middleware/errorHandler');

class CollaborationsService {
  async getPersonCollaborators(personId, filters = {}) {
    const { page = 1, limit = 20, min_collaborations = 2, sort_by = 'collaboration_count' } = filters;
    const offset = (page - 1) * limit;
    
    const cacheKey = `collaborators:${personId}:${JSON.stringify(filters)}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info(`Collaborators for person ${personId} retrieved from cache`);
        return cached;
      }

      // Simple collaborators query - much faster than view
      const collaborators = await sequelize.query(`
        SELECT 
          p2.id as collaborator_id,
          p2.preferred_name as collaborator_name,
          COUNT(DISTINCT a1.work_id) as collaboration_count
        FROM authorships a1
        INNER JOIN authorships a2 ON a1.work_id = a2.work_id 
        INNER JOIN persons p2 ON a2.person_id = p2.id
        WHERE a1.person_id = ? 
          AND a2.person_id != ?
          AND a2.person_id IS NOT NULL
        GROUP BY p2.id, p2.preferred_name
        HAVING COUNT(DISTINCT a1.work_id) >= ?
        ORDER BY collaboration_count DESC
        LIMIT ? OFFSET ?
      `, {
        replacements: [
          parseInt(personId), 
          parseInt(personId),
          parseInt(min_collaborations),
          parseInt(limit), 
          parseInt(offset)
        ],
        type: sequelize.QueryTypes.SELECT
      });

      // Sequelize QueryTypes.SELECT retorna array diretamente, não array de arrays
      const collaboratorsList = Array.isArray(collaborators) ? collaborators : [];
      
      const result = {
        person_id: parseInt(personId),
        collaborators: collaboratorsList.map(collab => ({
          collaborator_id: collab.collaborator_id,
          collaborator_name: collab.collaborator_name,
          collaboration_metrics: {
            total_collaborations: parseInt(collab.collaboration_count),
            collaboration_span_years: 0, // Simplified - sem dados de ano
            avg_citations_together: 0, // Simplified
            // open_access_percentage: 0 // removed  // Simplified
          },
          collaboration_strength: this.calculateCollaborationStrength(collab.collaboration_count)
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: collaboratorsList.length,
          totalPages: Math.ceil(collaboratorsList.length / limit),
          hasNext: false, // Simplified
          hasPrev: page > 1
        },
        filters: {
          min_collaborations: parseInt(min_collaborations),
          sort_by: sort_by
        },
        summary: {
          total_collaborators: collaboratorsList.length,
          avg_collaborations_per_collaborator: collaboratorsList.length > 0 ? 
            Math.round(collaboratorsList.reduce((sum, c) => sum + c.collaboration_count, 0) / collaboratorsList.length) : 0
        }
      };

      await cacheService.set(cacheKey, result, 300); // 5 min cache
      logger.info(`Collaborators for person ${personId} cached: ${collaboratorsList.length} collaborators`);
      
      return result;
    } catch (error) {
      logger.error(`Error fetching collaborators for person ${personId}:`, error);
      throw error;
    }
  }

  calculateCollaborationStrength(count) {
    if (count >= 10) return 'very_strong';
    if (count >= 5) return 'strong';
    if (count >= 2) return 'moderate';
    return 'weak';
  }

  async getCollaborationNetwork(personId, depth = 2) {
    const cacheKey = `network:${personId}:${depth}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info(`Network for person ${personId} retrieved from cache`);
        return cached;
      }

      // Simplified network - just direct collaborators
      const directCollabs = await sequelize.query(`
        SELECT DISTINCT
          p2.id,
          p2.preferred_name as name,
          COUNT(DISTINCT a1.work_id) as weight
        FROM authorships a1
        INNER JOIN authorships a2 ON a1.work_id = a2.work_id 
        INNER JOIN persons p2 ON a2.person_id = p2.id
        WHERE a1.person_id = ? AND a2.person_id != ?
        GROUP BY p2.id, p2.preferred_name
        HAVING COUNT(DISTINCT a1.work_id) >= 2
        LIMIT 20
      `, {
        replacements: [parseInt(personId), parseInt(personId)],
        type: sequelize.QueryTypes.SELECT
      });

      const directCollabsList = Array.isArray(directCollabs) ? directCollabs : [];
      
      // Build nodes
      const nodes = {
        [personId]: {
          id: parseInt(personId),
          name: `Person ${personId}`,
          type: 'central',
          level: 0
        }
      };

      directCollabsList.forEach((collab, index) => {
        nodes[collab.id] = {
          id: collab.id,
          name: collab.name,
          type: 'direct_collaborator',
          level: 1
        };
      });

      // Build edges
      const edges = directCollabsList.map(collab => ({
        source: parseInt(personId),
        target: collab.id,
        weight: collab.weight,
        relationship: 'collaboration'
      }));

      const result = {
        central_person_id: parseInt(personId),
        network_depth: parseInt(depth),
        nodes,
        edges,
        network_stats: {
          total_nodes: Object.keys(nodes).length,
          total_edges: edges.length,
          direct_collaborators: directCollabsList.length,
          network_density: 'moderate'
        }
      };

      await cacheService.set(cacheKey, result, 600); // 10 min cache
      logger.info(`Network for person ${personId} cached: ${Object.keys(nodes).length} nodes`);
      
      return result;
    } catch (error) {
      logger.error(`Error building network for person ${personId}:`, error);
      throw error;
    }
  }

  async getTopCollaborations(filters = {}) {
    const { limit = 20, min_collaborations = 5, year_from, year_to } = filters;
    
    const cacheKey = `top_collaborations:${JSON.stringify(filters)}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info('Top collaborations retrieved from cache');
        return cached;
      }

      // Very simplified top collaborations
      const topPairs = await sequelize.query(`
        SELECT 
          p1.id as person1_id,
          p1.preferred_name as person1_name,
          p2.id as person2_id, 
          p2.preferred_name as person2_name,
          COUNT(DISTINCT a1.work_id) as collaboration_count
        FROM authorships a1
        INNER JOIN authorships a2 ON a1.work_id = a2.work_id 
        INNER JOIN persons p1 ON a1.person_id = p1.id
        INNER JOIN persons p2 ON a2.person_id = p2.id
        LEFT JOIN publications pub ON a1.work_id = pub.work_id
        WHERE a1.person_id < a2.person_id
          ${year_from ? 'AND pub.year >= ?' : ''}
          ${year_to ? 'AND pub.year <= ?' : ''}
        GROUP BY p1.id, p1.preferred_name, p2.id, p2.preferred_name
        HAVING COUNT(DISTINCT a1.work_id) >= ?
        ORDER BY collaboration_count DESC
        LIMIT ?
      `, {
        replacements: [
          ...(year_from ? [parseInt(year_from)] : []),
          ...(year_to ? [parseInt(year_to)] : []),
          parseInt(min_collaborations),
          parseInt(limit)
        ],
        type: sequelize.QueryTypes.SELECT
      });

      const topPairsList = Array.isArray(topPairs) ? topPairs : [];
      
      const result = {
        top_collaborations: topPairsList.map(pair => ({
          collaboration_pair: {
            person1: {
              id: pair.person1_id,
              name: pair.person1_name
            },
            person2: {
              id: pair.person2_id,
              name: pair.person2_name
            }
          },
          collaboration_metrics: {
            total_collaborations: parseInt(pair.collaboration_count),
            avg_citations_together: 0,
            // open_access_percentage: 0 // removed
          },
          collaboration_strength: this.calculateCollaborationStrength(pair.collaboration_count)
        })),
        summary: {
          total_partnerships: topPairsList.length,
          avg_collaborations: topPairsList.length > 0 ? 
            Math.round(topPairsList.reduce((sum, p) => sum + p.collaboration_count, 0) / topPairsList.length) : 0
        }
      };

      await cacheService.set(cacheKey, result, 1800); // 30 min cache
      logger.info(`Top collaborations cached: ${topPairsList.length} partnerships`);
      
      return result;
    } catch (error) {
      logger.error('Error fetching top collaborations:', error);
      throw error;
    }
  }
}

module.exports = new CollaborationsService();