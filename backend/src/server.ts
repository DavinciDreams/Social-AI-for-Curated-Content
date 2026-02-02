import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import helmet from 'helmet';
import morgan from 'morgan';
import { createClient } from 'redis';
import compression from 'compression';
import { initializeCache, closeCache } from './middleware/cache';
import { feedRouter } from './services/feed/feedRouter';
import { configRouter } from './services/config/configRouter';
import { authRouter } from './services/auth/authRouter';
import { savedRouter } from './services/saved/savedRouter';
import graphRouter from './services/graph/graphRouter';
import recommendationRouter from './services/recommendation/recommendationRouter';
import searchRouter from './services/search/searchRouter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { initGraphService } from './services/graph/graphService';
import { initializeElasticsearch, createFeedIndex } from './services/search/searchService';
import { initializeUsersTable } from './models/user';
import { initializeFeedsTable } from './models/feed';
import { initializeSavedItemsTable } from './models/savedItem';
import { apiRateLimit, anonymousRateLimit, authenticatedRateLimit, authRateLimit, initializeRedisRateLimit } from './middleware/rateLimit';
import { sanitizeInput } from './middleware/validation';
import { provideCSRFToken } from './middleware/auth';
import { requestTiming, responseTimeTracking, metricsCollection, getHealthMetrics } from './middleware/monitoring';
import { performHealthChecks } from './services/monitoring/healthService';
import { logger, stream } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Redis client for session storage
let redisClient: ReturnType<typeof createClient> | null = null;

// Initialize Redis for session storage
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
            logger.error('Redis Client Error', { error: err });
        });
        
        redisClient.connect().catch((err) => {
            logger.warn('Failed to connect to Redis, sessions will use memory store', { error: err.message });
            redisClient = null;
        });
    } catch (error) {
        logger.warn('Failed to initialize Redis client', { error });
        redisClient = null;
    }
}

// Session configuration
const sessionConfig: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'lax',
    },
};

// Use Redis store if available, otherwise use memory store
if (redisClient) {
    const RedisStore = require('connect-redis')(session);
    sessionConfig.store = new RedisStore({ client: redisClient });
    logger.info('Using Redis for session storage');
} else {
    logger.warn('Using memory store for sessions (not recommended for production)');
}

// Logging middleware - use winston for structured logging
const nodeEnv = process.env.NODE_ENV || 'development';
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Winston HTTP logging
app.use(morgan('combined', { stream }));

// Security headers with helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// CORS middleware - configured for production
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : [process.env.FRONTEND_URL || 'http://localhost:5173'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));

// HTTPS enforcement in production
if (process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS === 'true') {
    app.use((req, res, next) => {
        if (!req.secure) {
            return res.redirect(301, `https://${req.headers.host}${req.url}`);
        }
        next();
    });
}

// Input sanitization
app.use(sanitizeInput);

// Request timing and metrics
app.use(requestTiming);
app.use(responseTimeTracking);
app.use(metricsCollection);

// Rate limiting
app.use('/api/auth', authRateLimit);
app.use('/api', apiRateLimit);

// Session middleware
app.use(session(sessionConfig));

// Provide CSRF token
app.use(provideCSRFToken);

// Health check endpoint
app.get('/health', async (req, res) => {
    const health = await performHealthChecks();
    res.json(health);
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
    const metrics = getHealthMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics.metrics);
});

// Status endpoint
app.get('/status', async (req, res) => {
    res.json({
        status: 'running',
        version: process.env.APP_VERSION || '1.0.0',
        environment: nodeEnv,
    });
});

// Root route
app.get('/', async (req, res) => {
    res.json({
        status: 'ok',
        message: 'Brain Rot Filter Backend is running',
        environment: nodeEnv,
        redis: redisClient ? 'connected' : 'not connected',
        endpoints: {
            health: '/health',
            status: '/status',
            metrics: '/metrics',
            api: '/api',
        },
    });
});

// Initialize database tables on startup
Promise.all([
    initializeUsersTable(),
    initializeFeedsTable(),
    initializeSavedItemsTable(),
])
    .then(() => logger.info('Database tables initialized'))
    .catch((err) => logger.error('Failed to initialize database tables', { error: err }));

// API Routes
app.use('/api/feeds', feedRouter);
app.use('/api/config', configRouter);
app.use('/api/auth', authRouter);
app.use('/api/saved', savedRouter);
app.use('/api/graph', graphRouter);
app.use('/api/recommendations', recommendationRouter);
app.use('/api/search', searchRouter);

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

// Initialize rate limiting Redis client
initializeRedisRateLimit().catch((err) => {
    logger.warn('Failed to initialize Redis rate limiting', { error: err });
});

// Start server
app.listen(port, () => {
    logger.info('Server started', {
        port,
        environment: nodeEnv,
        pid: process.pid,
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    if (redisClient) {
        await redisClient.quit();
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...');
    if (redisClient) {
        await redisClient.quit();
    }
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error });
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection', { reason, promise });
});
