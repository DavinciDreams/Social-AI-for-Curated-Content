import { logger } from '../../utils/logger';
import { getMetrics } from '../../middleware/monitoring';

interface MetricData {
    name: string;
    value: number;
    timestamp: Date;
    tags?: Record<string, string>;
}

interface AggregatedMetrics {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
}

/**
 * Store for metrics data
 */
class MetricsStore {
    private metrics: Map<string, MetricData[]> = new Map();
    private maxSamples = 1000;

    add(name: string, value: number, tags?: Record<string, string>): void {
        const metric: MetricData = {
            name,
            value,
            timestamp: new Date(),
            tags,
        };

        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }

        const samples = this.metrics.get(name)!;
        samples.push(metric);

        // Keep only max samples
        if (samples.length > this.maxSamples) {
            samples.shift();
        }
    }

    get(name: string): MetricData[] | undefined {
        return this.metrics.get(name);
    }

    aggregate(name: string, windowMs?: number): AggregatedMetrics | null {
        const samples = this.metrics.get(name);
        if (!samples || samples.length === 0) {
            return null;
        }

        // Filter by time window if specified
        let filteredSamples = samples;
        if (windowMs) {
            const cutoff = new Date(Date.now() - windowMs);
            filteredSamples = samples.filter(s => s.timestamp >= cutoff);
        }

        if (filteredSamples.length === 0) {
            return null;
        }

        const values = filteredSamples.map(s => s.value);
        values.sort((a, b) => a - b);

        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const min = values[0];
        const max = values[values.length - 1];
        const p95Index = Math.floor(values.length * 0.95);
        const p99Index = Math.floor(values.length * 0.99);

        return {
            count: values.length,
            sum,
            avg,
            min,
            max,
            p95: values[p95Index] || max,
            p99: values[p99Index] || max,
        };
    }

    clear(name?: string): void {
        if (name) {
            this.metrics.delete(name);
        } else {
            this.metrics.clear();
        }
    }
}

const metricsStore = new MetricsStore();

/**
 * Record a metric
 */
export const recordMetric = (name: string, value: number, tags?: Record<string, string>): void => {
    metricsStore.add(name, value, tags);
};

/**
 * Record a counter metric
 */
const counters = new Map<string, number>();

export const incrementCounter = (name: string, value: number = 1, tags?: Record<string, string>): void => {
    const current = counters.get(name) || 0;
    counters.set(name, current + value);
    
    logger.debug('Counter incremented', {
        metric: name,
        value: current + value,
        tags,
    });
};

export const getCounter = (name: string): number => {
    return counters.get(name) || 0;
};

export const resetCounter = (name?: string): void => {
    if (name) {
        counters.delete(name);
    } else {
        counters.clear();
    }
};

/**
 * Record a gauge metric
 */
const gauges = new Map<string, number>();

export const setGauge = (name: string, value: number, tags?: Record<string, string>): void => {
    gauges.set(name, value);
    
    logger.debug('Gauge set', {
        metric: name,
        value,
        tags,
    });
};

export const getGauge = (name: string): number | undefined => {
    return gauges.get(name);
};

/**
 * Record a histogram metric
 */
export const recordHistogram = (name: string, value: number, tags?: Record<string, string>): void => {
    recordMetric(name, value, tags);
};

export const getHistogramStats = (name: string, windowMs?: number): AggregatedMetrics | null => {
    return metricsStore.aggregate(name, windowMs);
};

/**
 * Get all metrics
 */
export const getAllMetrics = (): Record<string, any> => {
    const result: Record<string, any> = {};
    
    // Add counters
    counters.forEach((value, name) => {
        result[`counter_${name}`] = value;
    });
    
    // Add gauges
    gauges.forEach((value, name) => {
        result[`gauge_${name}`] = value;
    });
    
    // Add histograms
    const monitoringMetrics = getMetrics();
    Object.entries(monitoringMetrics.requests.byPath).forEach(([path, count]) => {
        result[`requests_${path}`] = count;
    });
    
    return result;
};

/**
 * Get Prometheus-formatted metrics
 */
export const getPrometheusMetrics = (): string => {
    const lines: string[] = [];
    
    // Add counters
    counters.forEach((value, name) => {
        lines.push(`counter_${name} ${value}`);
    });
    
    // Add gauges
    gauges.forEach((value, name) => {
        lines.push(`gauge_${name} ${value}`);
    });
    
    // Add request metrics
    const monitoringMetrics = getMetrics();
    Object.entries(monitoringMetrics.requests.byPath).forEach(([path, count]) => {
        lines.push(`requests_path_${path.replace(/\//g, '_')} ${count}`);
    });
    
    // Add error metrics
    Object.entries(monitoringMetrics.errors.byStatus).forEach(([status, count]) => {
        lines.push(`errors_status_${status} ${count}`);
    });
    
    return lines.join('\n');
};

/**
 * Get metrics summary for logging
 */
export const getMetricsReport = (): string => {
    const monitoringMetrics = getMetrics();
    
    const report = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        requests: monitoringMetrics.requests.total,
        errors: monitoringMetrics.errors.total,
        errorRate: monitoringMetrics.requests.total > 0
            ? ((monitoringMetrics.errors.total / monitoringMetrics.requests.total) * 100).toFixed(2) + '%'
            : '0%',
        avgResponseTime: `${Math.round(monitoringMetrics.responseTime.avg)}ms`,
        minResponseTime: `${monitoringMetrics.responseTime.min}ms`,
        maxResponseTime: `${monitoringMetrics.responseTime.max}ms`,
        topEndpoints: Object.entries(monitoringMetrics.requests.byPath)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([path, count]) => ({ path, count })),
        counters: Object.fromEntries(counters),
        gauges: Object.fromEntries(gauges),
    };
    
    return JSON.stringify(report, null, 2);
};

/**
 * Clear all metrics
 */
export const clearAllMetrics = (): void => {
    metricsStore.clear();
    counters.clear();
    gauges.clear();
};

/**
 * Export metrics for external monitoring systems
 */
export const exportMetrics = (format: 'json' | 'prometheus' = 'json'): string => {
    if (format === 'prometheus') {
        return getPrometheusMetrics();
    }
    return getMetricsReport();
};

export default {
    recordMetric,
    incrementCounter,
    getCounter,
    resetCounter,
    setGauge,
    getGauge,
    recordHistogram,
    getHistogramStats,
    getAllMetrics,
    getPrometheusMetrics,
    getMetricsReport,
    clearAllMetrics,
    exportMetrics,
};
