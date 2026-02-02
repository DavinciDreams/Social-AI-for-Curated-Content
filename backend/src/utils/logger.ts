import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const logDir = process.env.LOG_DIR || 'logs';

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
    })
);

// Create transports
const transports: winston.transport[] = [
    // Console transport
    new winston.transports.Console({
        format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    }),

    // Error log file - daily rotation
    new DailyRotateFile({
        filename: path.join(logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '30d',
        format: logFormat,
    }),

    // Combined log file - daily rotation
    new DailyRotateFile({
        filename: path.join(logDir, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        format: logFormat,
    }),

    // API request log file - daily rotation
    new DailyRotateFile({
        filename: path.join(logDir, 'api-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: logFormat,
    }),

    // Security log file - daily rotation
    new DailyRotateFile({
        filename: path.join(logDir, 'security-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '90d',
        format: logFormat,
    }),
];

// Create logger instance
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports,
    exitOnError: false,
});

// Create a stream object for Morgan HTTP logger
export const stream = {
    write: (message: string) => {
        logger.info(message.trim(), { type: 'http' });
    },
};

/**
 * Create a child logger with additional context
 */
export const createChildLogger = (context: Record<string, any>) => {
    return logger.child(context);
};

/**
 * Log levels enum
 */
export enum LogLevel {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    DEBUG = 'debug',
}

/**
 * Security logger for security-related events
 */
export const securityLogger = createChildLogger({ type: 'security' });

/**
 * API logger for API-related events
 */
export const apiLogger = createChildLogger({ type: 'api' });

/**
 * Performance logger for performance metrics
 */
export const performanceLogger = createChildLogger({ type: 'performance' });

/**
 * Error logger for error tracking
 */
export const errorLogger = createChildLogger({ type: 'error' });

export default logger;
