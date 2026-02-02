import { Pool } from 'pg';
import { createClient } from 'neo4j-driver';
import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';

dotenv.config();

// Test database connection
export const testDbConnection = async (): Promise<void> => {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/test',
    });

    try {
        await pool.query('SELECT 1');
        console.log('Database connection test passed');
    } catch (error) {
        console.error('Database connection test failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
};

// Test Neo4j connection
export const testNeo4jConnection = async (): Promise<void> => {
    const driver = require('neo4j-driver').default;
    const client = driver.driver(
        process.env.NEO4J_URI || 'bolt://localhost:7687',
        neo4j.auth.basic(
            process.env.NEO4J_USER || 'neo4j',
            process.env.NEO4J_PASSWORD || 'password'
        )
    );

    try {
        const session = client.session();
        await session.run('RETURN 1');
        console.log('Neo4j connection test passed');
        await session.close();
    } catch (error) {
        console.error('Neo4j connection test failed:', error);
        throw error;
    } finally {
        await client.close();
    }
};

// Test Elasticsearch connection
export const testElasticsearchConnection = async (): Promise<void> => {
    const client = new Client({
        node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    });

    try {
        await client.ping();
        console.log('Elasticsearch connection test passed');
    } catch (error) {
        console.error('Elasticsearch connection test failed:', error);
        throw error;
    } finally {
        await client.close();
    }
};

// Run all connection tests
export const setupTestEnvironment = async (): Promise<void> => {
    console.log('Setting up test environment...');
    
    try {
        await Promise.all([
            testDbConnection(),
            testNeo4jConnection(),
            testElasticsearchConnection(),
        ]);
        console.log('Test environment setup completed');
    } catch (error) {
        console.error('Test environment setup failed:', error);
        throw error;
    }
};
