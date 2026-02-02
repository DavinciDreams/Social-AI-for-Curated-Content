import { Request, Response, NextFunction } from 'express';
import { performanceLogger, apiLogger } from '../utils/logger';

// Store request start time in request object
declare global {
    namespace Express {
        interface Request {
            startTime?: number;
        }
    }
}

/**
 * Request timing middleware - records request start time
 */
export const requestTiming = (req: Request, res: Response, next: NextFunction): void => {
    req.startTime = Date.now();
    next();
};

/**
 * Response time tracking middleware - logs response time
 */
export const responseTimeTracking = (req: Request, res: Response, next: NextFunction): void => {
    const originalSend = res.send;
    
    res.send = function(this: Response, body?: any) {
        const responseTime = req.startTime ? Date.now() - req.startTime : 0;
        
        // Log response time
        performanceLogger.info('Request completed', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            ip: req.ip,
        });
        
        return originalSend.call(this, body);
    };
    
    next();
};

/**
 * Error rate monitoring middleware
 */
interface ErrorStats {
    count: number;
    lastError: Date;
    errors: Array<{
        timestamp: Date;
        message: string;
        path: string;
        method: string;
    }>;
}

const errorStats = new Map<string, ErrorStats>();

export const errorRateMonitoring = (err: Error, req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.method}:${req.path}`;
    const now = new Date();
    
    // Get or create error stats for this endpoint
    let stats = errorStats.get(key);
    if (!stats) {
        stats = {
            count: 0,
            lastError: now,
            errors: [],
        };
        errorStats.set(key, stats);
    }
    
    // Update stats
    stats.count++;
    stats.lastError = now;
    stats.errors.push({
        timestamp: now,
        message: err.message,
        path: req.path,
        method: req.method,
    });
    
    // Keep only last 100 errors
    if (stats.errors.length > 100) {
        stats.errors.shift();
    }
    
    // Log error
    apiLogger.error('Request error', {
        method: req.method,
        path: req.path,
        error: err.message,
        errorCount: stats.count,
        ip: req.ip,
    });
    
    // Check if error rate is too high (more than 10 errors in last minute)
    const recentErrors = stats.errors.filter(
        e => (now.getTime() - e.timestamp.getTime()) < 60000
    );
    
    if (recentErrors.length > 10) {
        apiLogger.warn('High error rate detected', {
            method: req.method,
            path: req.path,
            errorCount: recentErrors.length,
            ip: req.ip,
        });
    }
    
    next(err);
};

/**
 * Custom metrics collection middleware
 */
interface Metrics {
    requests: {
        total: number;
        byMethod: Record<string, number>;
        byPath: Record<string, number>;
    };
    errors: {
        total: number;
        byStatus: Record<number, number>;
    };
    responseTime: {
        min: number;
        max: number;
        avg: number;
        samples: number[];
    };
}

const metrics: Metrics = {
    requests: {
        total: 0,
        byMethod: {},
        byPath: {},
    },
    errors: {
        total: 0,
        byStatus: {},
    },
    responseTime: {
        min: Infinity,
        max: 0,
        avg: 0,
        samples: [],
    },
};

export const metricsCollection = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    
    // Track request
    metrics.requests.total++;
    metrics.requests.byMethod[req.method] = (metrics.requests.byMethod[req.method] || 0) + 1;
    metrics.requests.byPath[req.path] = (metrics.requests.byPath[req.path] || 0) + 1;
    
    // Track response
    const originalSend = res.send;
    res.send = function(this: Response, body?: any) {
        const responseTime = Date.now() - startTime;
        
        // Track errors
        if (res.statusCode >= 400) {
            metrics.errors.total++;
            metrics.errors.byStatus[res.statusCode] = (metrics.errors.byStatus[res.statusCode] || 0) + 1;
        }
        
        // Track response time
        metrics.responseTime.samples.push(responseTime);
        if (metrics.responseTime.samples.length > 1000) {
            metrics.responseTime.samples.shift();
        }
        
        metrics.responseTime.min = Math.min(metrics.responseTime.min, responseTime);
        metrics.responseTime.max = Math.max(metrics.responseTime.max, responseTime);
        metrics.responseTime.avg = 
            metrics.responseTime.samples.reduce((a, b) => a + b, 0) / 
            metrics.responseTime.samples.length;
        
        return originalSend.call(this, body);
    };
    
    next();
};

/**
 * Get current metrics
 */
export const getMetrics = (): Metrics => {
    return {
        requests: { ...metrics.requests },
        errors: { ...metrics.errors },
        responseTime: { ...metrics.responseTime },
    };
};

/**
 * Reset metrics
 */
export const resetMetrics = (): void => {
    metrics.requests.total = 0;
    metrics.requests.byMethod = {};
    metrics.requests.byPath = {};
    metrics.errors.total = 0;
    metrics.errors.byStatus = {};
    metrics.responseTime.min = Infinity;
    metrics.responseTime.max = 0;
    metrics.responseTime.avg = 0;
    metrics.responseTime.samples = [];
};

/**
 * Get metrics summary for logging
 */
export const getMetricsSummary = (): string => {
    const summary = {
        uptime: process.uptime(),
        requests: metrics.requests.total,
        errors: metrics.errors.total,
        avgResponseTime: `${Math.round(metrics.responseTime.avg)}ms`,
        minResponseTime: `${metrics.responseTime.min}ms`,
        maxResponseTime: `${metrics.responseTime.max}ms`,
        topPaths: Object.entries(metrics.requests.byPath)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([path, count]) => ({ path, count })),
    };
    
    return JSON.stringify(summary);
};

/**
 * Health check metrics
 */
export const getHealthMetrics = () => {
    return {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        metrics: {
            requests: metrics.requests.total,
            errors: metrics.errors.total,
            errorRate: metrics.requests.total > 0 
                ? (metrics.errors.total / metrics.requests.total * 100).toFixed(2) + '%'
                : '0%',
            avgResponseTime: `${Math.round(metrics.responseTime.avg)}ms`,
        },
        system: {
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
                rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
            },
            cpu: process.cpuUsage(),
        },
    };
};

export default {
    requestTiming,
    responseTimeTracking,
    errorRateMonitoring,
    metricsCollection,
    getMetrics,
    resetMetrics,
    getMetricsSummary,
    getHealthMetrics,
};
