import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';

/**
 * Generic validation middleware factory
 */
export const validate = (schema: z.ZodSchema<any>, target: 'body' | 'query' | 'params' = 'body') => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            const data = req[target];
            const validatedData = schema.parse(data);
            req[target] = validatedData;
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                logger.warn('Validation failed', {
                    errors: error.issues,
                    path: req.path,
                    method: req.method,
                });
                res.status(400).json({
                    error: 'Validation Error',
                    details: error.issues.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                });
                return;
            }
            next(error);
        }
    };
};

/**
 * Sanitize string input to prevent XSS
 */
export const sanitizeString = (input: string): string => {
    if (typeof input !== 'string') return input;
    return input
        .replace(/[<>]/g, '') // Remove < and >
        .trim();
};

/**
 * Sanitize object recursively
 */
export const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
        return sanitizeString(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                sanitized[key] = sanitizeObject(obj[key]);
            }
        }
        return sanitized;
    }
    return obj;
};

/**
 * Sanitization middleware
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
    if (req.body) {
        req.body = sanitizeObject(req.body);
    }
    if (req.query) {
        req.query = sanitizeObject(req.query);
    }
    if (req.params) {
        req.params = sanitizeObject(req.params);
    }
    next();
};

// ==================== Validation Schemas ====================

/**
 * Authentication schemas
 */
export const authSchemas = {
    twitterAuth: z.object({
        oauthId: z.string().min(1),
        email: z.string().email().optional(),
        name: z.string().min(1).optional(),
        username: z.string().min(1).optional(),
    }),

    redditAuth: z.object({
        oauthId: z.string().min(1),
        email: z.string().email().optional(),
        name: z.string().min(1).optional(),
        username: z.string().min(1).optional(),
    }),

    googleAuth: z.object({
        oauthId: z.string().min(1),
        email: z.string().email().optional(),
        name: z.string().min(1).optional(),
        username: z.string().min(1).optional(),
    }),
};

/**
 * Feed schemas
 */
export const feedSchemas = {
    getFeeds: z.object({
        page: z.string().optional().transform((val) => val ? parseInt(val, 10) : 1),
        limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 20),
        source: z.string().optional(),
    }),

    updateConfig: z.object({
        sources: z.array(z.string()).optional(),
        keywords: z.array(z.string()).optional(),
        minScore: z.number().min(0).max(100).optional(),
    }),
};

/**
 * Saved items schemas
 */
export const savedSchemas = {
    saveItem: z.object({
        feedItemId: z.string().uuid(),
    }),

    getSavedItems: z.object({
        page: z.string().optional().transform((val) => val ? parseInt(val, 10) : 1),
        limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 20),
    }),
};

/**
 * Graph schemas
 */
export const graphSchemas = {
    getGraphData: z.object({
        entityTypes: z.string().optional().transform((val) => val ? val.split(',') : undefined),
        sources: z.string().optional().transform((val) => val ? val.split(',') : undefined),
        dateRange: z.object({
            start: z.string().datetime(),
            end: z.string().datetime(),
        }).optional(),
        limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 100),
    }),

    searchEntities: z.object({
        query: z.string().min(1).max(100),
        limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 20),
    }),

    saveFeedGraph: z.object({
        feedId: z.string().uuid(),
    }),
};

/**
 * Recommendation schemas
 */
export const recommendationSchemas = {
    getRecommendations: z.object({
        userId: z.string().uuid(),
        limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 10),
    }),

    getTrending: z.object({
        limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 10),
    }),

    getFeedRecommendations: z.object({
        feedId: z.string().uuid(),
        limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 5),
    }),
};

/**
 * Search schemas
 */
export const searchSchemas = {
    search: z.object({
        query: z.string().min(1).max(500),
        page: z.string().optional().transform((val) => val ? parseInt(val, 10) : 1),
        limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 20),
        source: z.string().optional(),
        dateFrom: z.string().datetime().optional(),
        dateTo: z.string().datetime().optional(),
    }),
};

/**
 * Common validation schemas
 */
export const commonSchemas = {
    uuid: z.string().uuid(),

    email: z.string().email(),

    pagination: z.object({
        page: z.string().optional().transform((val) => val ? parseInt(val, 10) : 1),
        limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 20),
    }),

    dateRange: z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
    }).refine(
        (data) => new Date(data.start) <= new Date(data.end),
        { message: 'Start date must be before end date' }
    ),
};

/**
 * Export all schemas
 */
export const validationSchemas = {
    auth: authSchemas,
    feed: feedSchemas,
    saved: savedSchemas,
    graph: graphSchemas,
    recommendation: recommendationSchemas,
    search: searchSchemas,
    common: commonSchemas,
};
