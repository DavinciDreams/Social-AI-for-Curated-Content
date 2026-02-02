import { Request, Response, NextFunction } from 'express';
import { createClient, RedisClientType } from 'redis';

/**
 * Cache configuration
 */
export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in seconds
  prefix: string;
}

/**
 * Default cache configuration
 */
const defaultConfig: CacheConfig = {
  enabled: process.env.CACHE_ENABLED === 'true',
  ttl: parseInt(process.env.CACHE_TTL || '300', 10), // Default 5 minutes
  prefix: process.env.CACHE_PREFIX || 'api:',
};

/**
 * Redis client for caching
 */
let cacheClient: RedisClientType | null = null;

/**
 * Initialize Redis cache client
 */
export const initializeCache = async (): Promise<void> => {
  if (!defaultConfig.enabled) {
    console.log('Cache is disabled');
    return;
  }

  try {
    cacheClient = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
      password: process.env.REDIS_PASSWORD,
    });

    cacheClient.on('error', (err) => {
      console.error('Redis cache error:', err);
    });

    await cacheClient.connect();
    console.log('Redis cache client initialized');
  } catch (error) {
    console.error('Failed to initialize Redis cache:', error);
    cacheClient = null;
  }
};

/**
 * Generate cache key from request
 */
export const generateCacheKey = (req: Request): string => {
  const url = req.originalUrl || req.url;
  const userId = (req as any).session?.userId || 'anonymous';
  return `${defaultConfig.prefix}${userId}:${url}`;
};

/**
 * Response caching middleware
 */
export const cacheMiddleware = (options: Partial<CacheConfig> = {}) => {
  const config = { ...defaultConfig, ...options };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching if cache is disabled
    if (!config.enabled || !cacheClient) {
      return next();
    }

    const cacheKey = generateCacheKey(req);

    try {
      // Try to get cached response
      const cachedData = await cacheClient.get(cacheKey);

      if (cachedData) {
        const { data, contentType } = JSON.parse(cachedData);
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('X-Cache', 'HIT');
        res.send(data);
        return;
      }

      // Store original send method
      const originalSend = res.send.bind(res);

      // Override send method to cache response
      res.send = (body: any): Response => {
        // Cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const cacheData = JSON.stringify({
            data: body,
            contentType: res.getHeader('Content-Type') || 'application/json',
          });

          cacheClient
            ?.setEx(cacheKey, config.ttl, cacheData)
            .catch((err) => console.error('Cache set error:', err));
        }

        res.setHeader('X-Cache', 'MISS');
        return originalSend(body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next(); // Continue without caching on error
    }
  };
};

/**
 * Invalidate cache by pattern
 */
export const invalidateCachePattern = async (pattern: string): Promise<void> => {
  if (!cacheClient) {
    return;
  }

  try {
    let count = 0;
    for await (const key of cacheClient.scanIterator({
      MATCH: `${defaultConfig.prefix}${pattern}`,
    })) {
      await cacheClient.del(key);
      count++;
    }
    if (count > 0) {
      console.log(`Invalidated ${count} cache entries matching pattern: ${pattern}`);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
};

/**
 * Invalidate cache by key
 */
export const invalidateCacheKey = async (key: string): Promise<void> => {
  if (!cacheClient) {
    return;
  }

  try {
    const fullKey = `${defaultConfig.prefix}${key}`;
    await cacheClient.del(fullKey);
    console.log(`Invalidated cache key: ${fullKey}`);
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
};

/**
 * Invalidate all cache
 */
export const invalidateAllCache = async (): Promise<void> => {
  if (!cacheClient) {
    return;
  }

  try {
    let count = 0;
    for await (const key of cacheClient.scanIterator({
      MATCH: `${defaultConfig.prefix}*`,
    }) as AsyncIterableIterator<string>) {
      await cacheClient.del(key);
      count++;
    }
    if (count > 0) {
      console.log(`Invalidated all ${count} cache entries`);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
};

/**
 * Close cache connection
 */
export const closeCache = async (): Promise<void> => {
  if (cacheClient) {
    await cacheClient.quit();
    console.log('Cache connection closed');
  }
};

export default {
  initializeCache,
  cacheMiddleware,
  generateCacheKey,
  invalidateCachePattern,
  invalidateCacheKey,
  invalidateAllCache,
  closeCache,
};
