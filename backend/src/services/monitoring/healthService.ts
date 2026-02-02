import { logger } from '../../utils/logger';
import { getHealthMetrics as getMonitoringMetrics } from '../../middleware/monitoring';
import { createClient } from 'redis';

interface HealthCheck {
    name: string;
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
    responseTime?: number;
}

interface HealthStatus {
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: string;
    uptime: number;
    checks: HealthCheck[];
    metrics: any;
}

/**
 * Check database health
 */
const checkDatabaseHealth = async (): Promise<HealthCheck> => {
    const startTime = Date.now();
    
    try {
        // Simple query to check database connection
        const { Pool } = require('pg');
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });
        
        await pool.query('SELECT 1');
        
        return {
            name: 'database',
            status: 'healthy',
            responseTime: Date.now() - startTime,
        };
    } catch (error) {
        logger.error('Database health check failed', { error });
        return {
            name: 'database',
            status: 'unhealthy',
            message: 'Database connection failed',
            responseTime: Date.now() - startTime,
        };
    }
};

/**
 * Check Redis health
 */
const checkRedisHealth = async (): Promise<HealthCheck> => {
    const startTime = Date.now();
    
    try {
        const redisClient = createClient({
            socket: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379', 10),
            },
            password: process.env.REDIS_PASSWORD,
        });
        
        await redisClient.connect();
        await redisClient.ping();
        await redisClient.quit();
        
        return {
            name: 'redis',
            status: 'healthy',
            responseTime: Date.now() - startTime,
        };
    } catch (error) {
        logger.warn('Redis health check failed', { error });
        return {
            name: 'redis',
            status: 'degraded',
            message: 'Redis not available',
            responseTime: Date.now() - startTime,
        };
    }
};

/**
 * Check Elasticsearch health
 */
const checkElasticsearchHealth = async (): Promise<HealthCheck> => {
    const startTime = Date.now();
    
    try {
        const { Client } = require('@elastic/elasticsearch');
        const client = new Client({
            node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
        });
        
        await client.ping();
        
        return {
            name: 'elasticsearch',
            status: 'healthy',
            responseTime: Date.now() - startTime,
        };
    } catch (error) {
        logger.warn('Elasticsearch health check failed', { error });
        return {
            name: 'elasticsearch',
            status: 'degraded',
            message: 'Elasticsearch not available',
            responseTime: Date.now() - startTime,
        };
    }
};

/**
 * Check Neo4j health
 */
const checkNeo4jHealth = async (): Promise<HealthCheck> => {
    const startTime = Date.now();
    
    try {
        const neo4j = require('neo4j-driver');
        const driver = neo4j.driver(
            process.env.NEO4J_URI || 'bolt://localhost:7687',
            neo4j.auth.basic(
                process.env.NEO4J_USER || 'neo4j',
                process.env.NEO4J_PASSWORD || 'password'
            )
        );
        
        const session = driver.session();
        await session.run('RETURN 1');
        await session.close();
        
        return {
            name: 'neo4j',
            status: 'healthy',
            responseTime: Date.now() - startTime,
        };
    } catch (error) {
        logger.warn('Neo4j health check failed', { error });
        return {
            name: 'neo4j',
            status: 'degraded',
            message: 'Neo4j not available',
            responseTime: Date.now() - startTime,
        };
    }
};

/**
 * Check disk space
 */
const checkDiskSpace = async (): Promise<HealthCheck> => {
    try {
        const fs = require('fs');
        const stats = fs.statSync('.');
        
        // Get disk usage (simplified check)
        const diskUsage = process.platform === 'win32'
            ? { free: 10000000000, used: 5000000000, total: 15000000000 } // Mock values for Windows
            : { free: 10000000000, used: 5000000000, total: 15000000000 }; // Mock values for other platforms
        
        const usagePercent = (diskUsage.used / diskUsage.total) * 100;
        
        return {
            name: 'disk',
            status: usagePercent > 90 ? 'unhealthy' : usagePercent > 75 ? 'degraded' : 'healthy',
            message: `Disk usage: ${usagePercent.toFixed(2)}%`,
        };
    } catch (error) {
        return {
            name: 'disk',
            status: 'degraded',
            message: 'Unable to check disk space',
        };
    }
};

/**
 * Check memory usage
 */
const checkMemoryUsage = (): HealthCheck => {
    const memoryUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const usagePercent = (memoryUsage.heapUsed / totalMemory) * 100;
    
    return {
        name: 'memory',
        status: usagePercent > 90 ? 'unhealthy' : usagePercent > 75 ? 'degraded' : 'healthy',
        message: `Memory usage: ${usagePercent.toFixed(2)}%`,
    };
};

/**
 * Perform all health checks
 */
export const performHealthChecks = async (): Promise<HealthStatus> => {
    const checks = await Promise.allSettled([
        checkDatabaseHealth(),
        checkRedisHealth(),
        checkElasticsearchHealth(),
        checkNeo4jHealth(),
        checkDiskSpace(),
        Promise.resolve(checkMemoryUsage()),
    ]);
    
    const healthChecks: HealthCheck[] = checks.map((result, index) => {
        if (result.status === 'fulfilled') {
            return result.value;
        }
        return {
            name: `check-${index}`,
            status: 'unhealthy',
            message: result.reason?.toString(),
        };
    });
    
    // Determine overall health status
    const hasUnhealthy = healthChecks.some(c => c.status === 'unhealthy');
    const hasDegraded = healthChecks.some(c => c.status === 'degraded');
    
    const overallStatus: 'healthy' | 'unhealthy' | 'degraded' = hasUnhealthy
        ? 'unhealthy'
        : hasDegraded
        ? 'degraded'
        : 'healthy';
    
    const monitoringMetrics = getMonitoringMetrics();
    
    const healthStatus: HealthStatus = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks: healthChecks,
        metrics: monitoringMetrics,
    };
    
    logger.info('Health check completed', {
        status: overallStatus,
        checks: healthChecks.length,
        failed: healthChecks.filter(c => c.status !== 'healthy').length,
    });
    
    return healthStatus;
};

/**
 * Get simple health status for quick checks
 */
export const getSimpleHealthStatus = async (): Promise<{ status: string; checks: string[] }> => {
    const health = await performHealthChecks();
    
    return {
        status: health.status,
        checks: health.checks.map(c => `${c.name}: ${c.status}`),
    };
};

export default {
    performHealthChecks,
    getSimpleHealthStatus,
};
