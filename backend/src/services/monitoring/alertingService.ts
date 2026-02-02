import { logger } from '../../utils/logger';
import { getMetrics } from '../../middleware/monitoring';

interface AlertRule {
    name: string;
    description: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    condition: () => boolean;
    cooldownMs: number;
}

interface Alert {
    id: string;
    ruleName: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}

/**
 * Store for active alerts
 */
const activeAlerts = new Map<string, Date>();

/**
 * Alert rules configuration
 */
const alertRules: AlertRule[] = [
    {
        name: 'high_error_rate',
        description: 'Error rate exceeds 10% of requests',
        severity: 'error',
        condition: () => {
            const metrics = getMetrics();
            if (metrics.requests.total === 0) return false;
            const errorRate = (metrics.errors.total / metrics.requests.total) * 100;
            return errorRate > 10;
        },
        cooldownMs: 5 * 60 * 1000, // 5 minutes
    },
    {
        name: 'slow_response_time',
        description: 'Average response time exceeds 1 second',
        severity: 'warning',
        condition: () => {
            const metrics = getMetrics();
            return metrics.responseTime.avg > 1000;
        },
        cooldownMs: 10 * 60 * 1000, // 10 minutes
    },
    {
        name: 'very_slow_response_time',
        description: 'Average response time exceeds 5 seconds',
        severity: 'error',
        condition: () => {
            const metrics = getMetrics();
            return metrics.responseTime.avg > 5000;
        },
        cooldownMs: 5 * 60 * 1000, // 5 minutes
    },
    {
        name: 'high_memory_usage',
        description: 'Memory usage exceeds 90%',
        severity: 'critical',
        condition: () => {
            const memoryUsage = process.memoryUsage();
            const totalMemory = require('os').totalmem();
            const usagePercent = (memoryUsage.heapUsed / totalMemory) * 100;
            return usagePercent > 90;
        },
        cooldownMs: 2 * 60 * 1000, // 2 minutes
    },
    {
        name: 'disk_space_low',
        description: 'Disk space is running low',
        severity: 'warning',
        condition: () => {
            // Simplified check - in production, use actual disk monitoring
            return false;
        },
        cooldownMs: 30 * 60 * 1000, // 30 minutes
    },
];

/**
 * Check alert rules
 */
export const checkAlertRules = async (): Promise<Alert[]> => {
    const triggeredAlerts: Alert[] = [];
    const now = new Date();

    for (const rule of alertRules) {
        const lastAlertTime = activeAlerts.get(rule.name);
        
        // Check cooldown
        if (lastAlertTime && (now.getTime() - lastAlertTime.getTime()) < rule.cooldownMs) {
            continue;
        }

        // Check condition
        try {
            if (rule.condition()) {
                const alert: Alert = {
                    id: `${rule.name}-${now.getTime()}`,
                    ruleName: rule.name,
                    severity: rule.severity,
                    message: rule.description,
                    timestamp: now,
                    metadata: {
                        triggeredAt: now.toISOString(),
                    },
                };

                triggeredAlerts.push(alert);
                activeAlerts.set(rule.name, now);

                // Log alert
                logAlert(alert);
            }
        } catch (error) {
            logger.error('Error checking alert rule', {
                rule: rule.name,
                error,
            });
        }
    }

    return triggeredAlerts;
};

/**
 * Log an alert
 */
const logAlert = (alert: Alert): void => {
    const logMethod = alert.severity === 'critical'
        ? logger.error
        : alert.severity === 'error'
        ? logger.error
        : alert.severity === 'warning'
        ? logger.warn
        : logger.info;

    logMethod('Alert triggered', {
        alertId: alert.id,
        rule: alert.ruleName,
        severity: alert.severity,
        message: alert.message,
        timestamp: alert.timestamp.toISOString(),
    });
};

/**
 * Get active alerts
 */
export const getActiveAlerts = (): Alert[] => {
    const alerts: Alert[] = [];
    const now = new Date();

    activeAlerts.forEach((timestamp, ruleName) => {
        // Find the rule definition
        const rule = alertRules.find(r => r.name === ruleName);
        if (!rule) return;

        alerts.push({
            id: `${ruleName}-${timestamp.getTime()}`,
            ruleName: rule.name,
            severity: rule.severity,
            message: rule.description,
            timestamp,
        });
    });

    return alerts;
};

/**
 * Clear an alert by rule name
 */
export const clearAlert = (ruleName: string): void => {
    activeAlerts.delete(ruleName);
    logger.info('Alert cleared', { rule: ruleName });
};

/**
 * Clear all alerts
 */
export const clearAllAlerts = (): void => {
    activeAlerts.clear();
    logger.info('All alerts cleared');
};

/**
 * Get alert summary
 */
export const getAlertSummary = (): {
    total: number;
    bySeverity: Record<string, number>;
    recent: Alert[];
} => {
    const activeAlertsList = getActiveAlerts();
    
    const bySeverity: Record<string, number> = {
        critical: 0,
        error: 0,
        warning: 0,
        info: 0,
    };

    activeAlertsList.forEach(alert => {
        bySeverity[alert.severity]++;
    });

    // Get alerts from last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = activeAlertsList.filter(a => a.timestamp >= oneHourAgo);

    return {
        total: activeAlertsList.length,
        bySeverity,
        recent,
    };
};

/**
 * Check for critical system issues
 */
export const checkCriticalIssues = async (): Promise<{
    hasCriticalIssues: boolean;
    issues: string[];
}> => {
    const issues: string[] = [];
    const metrics = getMetrics();

    // Check error rate
    if (metrics.requests.total > 0) {
        const errorRate = (metrics.errors.total / metrics.requests.total) * 100;
        if (errorRate > 50) {
            issues.push(`Critical error rate: ${errorRate.toFixed(2)}%`);
        }
    }

    // Check response time
    if (metrics.responseTime.avg > 10000) {
        issues.push(`Critical response time: ${Math.round(metrics.responseTime.avg)}ms`);
    }

    // Check memory
    const memoryUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const usagePercent = (memoryUsage.heapUsed / totalMemory) * 100;
    if (usagePercent > 95) {
        issues.push(`Critical memory usage: ${usagePercent.toFixed(2)}%`);
    }

    return {
        hasCriticalIssues: issues.length > 0,
        issues,
    };
};

export default {
    checkAlertRules,
    getActiveAlerts,
    clearAlert,
    clearAllAlerts,
    getAlertSummary,
    checkCriticalIssues,
};
