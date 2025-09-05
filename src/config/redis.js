const { createClient } = require('redis');
require('dotenv').config();

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  socket: {
    connectTimeout: 10000,
    lazyConnect: true,
  },
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
};

let client = null;

const createRedisClient = async () => {
  if (client) {
    return client;
  }

  try {
    client = createClient({
      url: `redis://${redisConfig.password ? `:${redisConfig.password}@` : ''}${redisConfig.host}:${redisConfig.port}`,
      socket: redisConfig.socket,
    });

    client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    client.on('connect', () => {
      console.log('✓ Redis connected');
    });

    client.on('disconnect', () => {
      console.log('✗ Redis disconnected');
    });

    await client.connect();
    return client;
  } catch (error) {
    console.error('✗ Redis connection failed:', error.message);
    return null;
  }
};

const getRedisClient = () => {
  return client;
};

const testRedisConnection = async () => {
  try {
    if (!client) {
      await createRedisClient();
    }
    
    if (client) {
      await client.ping();
      console.log('✓ Redis connection test successful');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('✗ Redis connection test failed:', error.message);
    return false;
  }
};

module.exports = {
  createRedisClient,
  getRedisClient,
  testRedisConnection,
};