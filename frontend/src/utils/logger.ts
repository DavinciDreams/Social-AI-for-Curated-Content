/**
 * Client-side logging utilities
 */

export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
}

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: string;
    data?: any;
}

/**
 * Get environment mode
 */
const isDevelopment = (): boolean => {
    return import.meta.env.MODE === 'development' || import.meta.env.DEV === 'true';
};

const isProduction = (): boolean => {
    return import.meta.env.MODE === 'production' || import.meta.env.PROD === 'true';
};

/**
 * Log a message with specified level
 */
const log = (level: LogLevel, message: string, context?: string, data?: any): void => {
    const entry: LogEntry = {
        level,
        message,
        timestamp: new Date().toISOString(),
        context,
        data,
    };

    // In development, log to console
    if (isDevelopment()) {
        const logMethod = level === LogLevel.ERROR
            ? console.error
            : level === LogLevel.WARN
            ? console.warn
            : level === LogLevel.DEBUG
            ? console.debug
            : console.info;

        logMethod(`[${entry.timestamp}] [${level.toUpperCase()}]${context ? ` [${context}]` : ''}: ${message}`, data || '');
    }

    // In production, send to error tracking service if configured
    if (isProduction()) {
        // Send to error tracking service (e.g., Sentry, LogRocket)
        if (level === LogLevel.ERROR || level === LogLevel.WARN) {
            sendToErrorTracking(entry);
        }
    }
};

/**
 * Send log to error tracking service
 */
const sendToErrorTracking = (entry: LogEntry): void => {
    // Check if error tracking service is available
    if (typeof window !== 'undefined' && (window as any).errorTracking) {
        (window as any).errorTracking(entry);
    }
};

/**
 * Debug level logging
 */
export const debug = (message: string, context?: string, data?: any): void => {
    log(LogLevel.DEBUG, message, context, data);
};

/**
 * Info level logging
 */
export const info = (message: string, context?: string, data?: any): void => {
    log(LogLevel.INFO, message, context, data);
};

/**
 * Warning level logging
 */
export const warn = (message: string, context?: string, data?: any): void => {
    log(LogLevel.WARN, message, context, data);
};

/**
 * Error level logging
 */
export const error = (message: string, context?: string, error?: Error): void => {
    log(LogLevel.ERROR, message, context, {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
    });
};

/**
 * Track user action
 */
export const trackAction = (action: string, properties?: Record<string, any>): void => {
    const entry: LogEntry = {
        level: LogLevel.INFO,
        message: `User action: ${action}`,
        timestamp: new Date().toISOString(),
        context: 'user_action',
        data: properties,
    };

    if (isDevelopment()) {
        console.log(`[${entry.timestamp}] [INFO] [USER_ACTION]: ${action}`, properties || '');
    }

    // Send to analytics
    if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics('track', action, properties);
    }
};

/**
 * Track page view
 */
export const trackPageView = (page: string, properties?: Record<string, any>): void => {
    const entry: LogEntry = {
        level: LogLevel.INFO,
        message: `Page view: ${page}`,
        timestamp: new Date().toISOString(),
        context: 'page_view',
        data: properties,
    };

    if (isDevelopment()) {
        console.log(`[${entry.timestamp}] [INFO] [PAGE_VIEW]: ${page}`, properties || '');
    }

    // Send to analytics
    if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics('pageview', page, properties);
    }
};

/**
 * Track error
 */
export const trackError = (error: Error, context?: string): void => {
    const entry: LogEntry = {
        level: LogLevel.ERROR,
        message: error.message,
        timestamp: new Date().toISOString(),
        context: context || 'error',
        data: {
            name: error.name,
            stack: error.stack,
        },
    };

    if (isDevelopment()) {
        console.error(`[${entry.timestamp}] [ERROR] [${context || 'ERROR'}]: ${error.message}`, {
            name: error.name,
            stack: error.stack,
        });
    }

    // Send to error tracking service
    sendToErrorTracking(entry);
};

/**
 * Track performance metric
 */
export const trackPerformance = (metric: string, value: number, context?: string): void => {
    const entry: LogEntry = {
        level: LogLevel.INFO,
        message: `Performance: ${metric} = ${value}ms`,
        timestamp: new Date().toISOString(),
        context: 'performance',
        data: { metric, value },
    };

    if (isDevelopment()) {
        console.log(`[${entry.timestamp}] [INFO] [PERFORMANCE]: ${metric} = ${value}ms`);
    }

    // Send to analytics
    if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics('timing', metric, value);
    }
};

/**
 * Initialize error tracking service
 */
export const initErrorTracking = (): void => {
    // Initialize error tracking service (e.g., Sentry)
    if (typeof window !== 'undefined') {
        // Example: Sentry initialization
        // Sentry.init({
        //     dsn: process.env.SENTRY_DSN,
        //     environment: import.meta.env.MODE,
        // });
    }
};

export default {
    debug,
    info,
    warn,
    error,
    trackAction,
    trackPageView,
    trackError,
    trackPerformance,
    initErrorTracking,
};
