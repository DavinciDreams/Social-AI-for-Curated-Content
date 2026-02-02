import settings from './settings.json';

// Load environment variables
const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const postgresHost = process.env.POSTGRES_HOST || 'localhost';
const postgresPort = parseInt(process.env.POSTGRES_PORT || '5432', 10);
const postgresDb = process.env.POSTGRES_DB || 'brainrot';
const postgresUser = process.env.POSTGRES_USER || 'admin';
const postgresPassword = process.env.POSTGRES_PASSWORD || 'password';
const neo4jUri = process.env.NEO4J_URI || 'bolt://localhost:7687';
const neo4jUser = process.env.NEO4J_USER || 'neo4j';
const neo4jPassword = process.env.NEO4J_PASSWORD || 'password';
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

export interface FeedConfig {
    id: string;
    name: string;
    url: string;
    type: string;
}

export interface AppConfig {
    feeds: FeedConfig[];
    filterPrompts: {
        system: string;
    };
    social?: {
        twitter?: string;
        reddit?: string;
    };
}

// Environment configuration for database and service connections
export const envConfig = {
    aiServiceUrl,
    postgres: {
        host: postgresHost,
        port: postgresPort,
        database: postgresDb,
        user: postgresUser,
        password: postgresPassword,
    },
    neo4j: {
        uri: neo4jUri,
        user: neo4jUser,
        password: neo4jPassword,
    },
    redis: {
        host: redisHost,
        port: redisPort,
    },
};

const config: AppConfig = settings;

export default config;
