const { getRedisClient } = require('../config/redis');
const { logger } = require('../middleware/errorHandler');

class CacheService {
  constructor() {
    this.defaultTTL = {
      search: parseInt(process.env.CACHE_TTL_SEARCH) || 3600,
      statistics: parseInt(process.env.CACHE_TTL_STATISTICS) || 86400,
      workDetails: parseInt(process.env.CACHE_TTL_WORK_DETAILS) || 7200,
      listings: 7200, // 2 hours for paginated listings
      relationships: 3600, // 1 hour for relational data
      organizations: 14400, // 4 hours for slow organizations queries
      signatures_statistics: 172800, // 48 hours for heavy signatures stats
      venues_statistics: 86400, // 24 hours for venues stats
      default: 1800
    };
  }

  generateKey(prefix, identifier, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    return `${prefix}:${identifier}${sortedParams ? `|${sortedParams}` : ''}`;
  }

  async get(key) {
    try {
      const client = getRedisClient();
      if (!client) {
        logger.debug('Redis unavailable - cache disabled');
        return null;
      }

      const value = await client.get(key);
      if (!value) {
        return null;
      }

      const parsed = JSON.parse(value);
      logger.debug(`Cache HIT: ${key}`);
      return parsed;
    } catch (error) {
      logger.warn(`Cache GET error for key ${key} - falling back to database:`, error.message);
      return null;
    }
  }

  async set(key, value, ttl = null) {
    try {
      const client = getRedisClient();
      if (!client) {
        logger.debug('Redis unavailable - skipping cache set');
        return false;
      }

      const serialized = JSON.stringify(value);
      const expiration = ttl || this.defaultTTL.default;
      
      await client.setEx(key, expiration, serialized);
      logger.debug(`Cache SET: ${key} (TTL: ${expiration}s)`);
      return true;
    } catch (error) {
      logger.warn(`Cache SET error for key ${key} - continuing without cache:`, error.message);
      return false;
    }
  }

  async del(key) {
    try {
      const client = getRedisClient();
      if (!client) {
        return false;
      }

      const result = await client.del(key);
      logger.debug(`Cache DEL: ${key}`);
      return result > 0;
    } catch (error) {
      logger.warn(`Cache DEL error for key ${key}:`, error.message);
      return false;
    }
  }

  async delPattern(pattern) {
    try {
      const client = getRedisClient();
      if (!client) {
        return 0;
      }

      const keys = await client.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      const result = await client.del(keys);
      logger.debug(`Cache DEL pattern: ${pattern} (${keys.length} keys)`);
      return result;
    } catch (error) {
      logger.warn(`Cache DEL pattern error for ${pattern}:`, error.message);
      return 0;
    }
  }

  async exists(key) {
    try {
      const client = getRedisClient();
      if (!client) {
        return false;
      }

      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      logger.warn(`Cache EXISTS error for key ${key}:`, error.message);
      return false;
    }
  }

  async getStats() {
    try {
      const client = getRedisClient();
      if (!client) {
        return null;
      }

      const info = await client.info('stats');
      const lines = info.split('\r\n');
      const stats = {};

      lines.forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          if (['keyspace_hits', 'keyspace_misses', 'connected_clients', 'used_memory'].includes(key)) {
            stats[key] = parseInt(value) || value;
          }
        }
      });

      if (stats.keyspace_hits && stats.keyspace_misses) {
        const total = stats.keyspace_hits + stats.keyspace_misses;
        stats.hit_rate = total > 0 ? ((stats.keyspace_hits / total) * 100).toFixed(2) : 0;
      }

      return stats;
    } catch (error) {
      logger.warn('Cache stats error:', error.message);
      return null;
    }
  }

  async cacheWrapper(key, fetchFunction, ttl = null) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    try {
      const result = await fetchFunction();
      if (result !== null && result !== undefined) {
        await this.set(key, result, ttl);
      }
      return result;
    } catch (error) {
      logger.error(`Cache wrapper error for key ${key}:`, error);
      throw error;
    }
  }

  getTTL(type) {
    return this.defaultTTL[type] || this.defaultTTL.default;
  }
}

module.exports = new CacheService();