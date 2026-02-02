import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { createClient } from 'redis';
import RedisStore from 'rate-limit-redis';

// Helper function to safely get IP key
const getIpKey = (req: Request): string => {
    const ip = req.ip;
    return ip || 'unknown';
};

// Extend Express Request type to include rateLimit property
declare module 'express' {
    interface Request {
        rateLimit?: {
            limit?: number;
            current?: number;
            remaining?: number;
            resetTime?: Date;
        };
    }
}

// Redis client for distributed rate limiting
let redisClient: ReturnType<typeof createClient> | null = null;

// Initialize Redis client for rate limiting
export const initializeRedisRateLimit = async () => {
    if (process.env.REDIS_HOST) {
        try {
            redisClient = createClient({
                socket: {
                    host: process.env.REDIS_HOST,
                    port: parseInt(process.env.REDIS_PORT || '6379', 10),
                },
                password: process.env.REDIS_PASSWORD,
            });

            redisClient.on('error', (err) => {
                console.error('Redis Rate Limit Error:', err);
            });

            await redisClient.connect();
            console.log('Redis rate limiting initialized');
        } catch (error) {
            console.warn('Failed to initialize Redis for rate limiting, using memory store:', error);
            redisClient = null;
        }
    }
};

/**
 * Rate limit exceeded response handler
 */
const rateLimitHandler = (req: Request, res: Response) => {
    res.status(429).json({
        error: 'Too Many Requests',
        message: 'You have exceeded rate limit. Please try again later.',
        retryAfter: res.getHeader('Retry-After') || '60',
    });
};

/**
 * Rate limiter for authenticated users - more generous limits
 */
export const authenticatedRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 requests per 15 minutes for authenticated users
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: (req) => !req.user, // Only apply if user is authenticated
    store: redisClient
        ? new RedisStore({
              client: redisClient,
              prefix: 'auth_limit:',
          } as any)
        : undefined,
});

/**
 * Rate limiter for anonymous users - stricter limits
 */
export const anonymousRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes for anonymous users
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: (req) => !!req.user, // Only apply if user is NOT authenticated
    store: redisClient
        ? new RedisStore({
              client: redisClient,
              prefix: 'anon_limit:',
          } as any)
        : undefined,
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 authentication attempts per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    skipFailedRequests: true,
    store: redisClient
        ? new RedisStore({
              client: redisClient,
              prefix: 'auth_limit:',
          } as any)
        : undefined,
});

/**
 * Rate limiter for API endpoints
 */
export const apiRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    store: redisClient
        ? new RedisStore({
              client: redisClient,
              prefix: 'api_limit:',
          } as any)
        : undefined,
});

/**
 * Rate limiter for write operations (POST, PUT, DELETE, PATCH)
 */
export const writeRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20, // 20 write operations per minute
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: (req) => {
        // Only apply to write operations
        const method = req.method;
        return !['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
    },
    store: redisClient
        ? new RedisStore({
              client: redisClient,
              prefix: 'write_limit:',
          } as any)
        : undefined,
});

/**
 * Rate limiter for search endpoints
 */
export const searchRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 searches per minute
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    store: redisClient
        ? new RedisStore({
              client: redisClient,
              prefix: 'search_limit:',
          } as any)
        : undefined,
});

/**
 * Get rate limit info for response headers
 */
export const getRateLimitInfo = (req: Request) => {
    return {
        limit: req.rateLimit?.limit,
        current: req.rateLimit?.current,
        remaining: req.rateLimit?.remaining,
        resetTime: req.rateLimit?.resetTime,
    };
};
