import { Pool, PoolClient } from 'pg';
import { envConfig } from '../config/config';

// Database connection pool
let pool: Pool | null = null;

/**
 * Get or create database connection pool
 */
export const getDbPool = (): Pool => {
    if (!pool) {
        pool = new Pool({
            host: envConfig.postgres.host,
            port: envConfig.postgres.port,
            database: envConfig.postgres.database,
            user: envConfig.postgres.user,
            password: envConfig.postgres.password,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
    }
    return pool;
};

/**
 * User interface
 */
export interface User {
    id: string;
    email: string;
    name: string;
    oauthProvider: 'twitter' | 'reddit' | 'google';
    oauthId: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Create user input interface
 */
export interface CreateUserInput {
    email: string;
    name: string;
    oauthProvider: 'twitter' | 'reddit' | 'google';
    oauthId: string;
}

/**
 * Initialize users table
 */
export const initializeUsersTable = async (): Promise<void> => {
    const pool = getDbPool();
    
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            oauth_provider VARCHAR(50) NOT NULL,
            oauth_id VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(oauth_provider, oauth_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id);
    `);
};

/**
 * Find user by ID
 */
export const findUserById = async (id: string): Promise<User | null> => {
    const pool = getDbPool();
    const result = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
    );
    
    if (result.rows.length === 0) {
        return null;
    }
    
    return mapRowToUser(result.rows[0]);
};

/**
 * Find user by OAuth provider and ID
 */
export const findUserByOAuth = async (
    oauthProvider: string,
    oauthId: string
): Promise<User | null> => {
    const pool = getDbPool();
    const result = await pool.query(
        'SELECT * FROM users WHERE oauth_provider = $1 AND oauth_id = $2',
        [oauthProvider, oauthId]
    );
    
    if (result.rows.length === 0) {
        return null;
    }
    
    return mapRowToUser(result.rows[0]);
};

/**
 * Find user by email
 */
export const findUserByEmail = async (email: string): Promise<User | null> => {
    const pool = getDbPool();
    const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
    );
    
    if (result.rows.length === 0) {
        return null;
    }
    
    return mapRowToUser(result.rows[0]);
};

/**
 * Create a new user
 */
export const createUser = async (input: CreateUserInput): Promise<User> => {
    const pool = getDbPool();
    const result = await pool.query(
        `INSERT INTO users (email, name, oauth_provider, oauth_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [input.email, input.name, input.oauthProvider, input.oauthId]
    );
    
    return mapRowToUser(result.rows[0]);
};

/**
 * Find or create user by OAuth
 */
export const findOrCreateUserByOAuth = async (
    email: string,
    name: string,
    oauthProvider: 'twitter' | 'reddit' | 'google',
    oauthId: string
): Promise<User> => {
    // Try to find existing user
    let user = await findUserByOAuth(oauthProvider, oauthId);
    
    if (user) {
        // Update user info if changed
        if (user.email !== email || user.name !== name) {
            user = await updateUser(user.id, { email, name });
        }
        return user;
    }
    
    // Create new user
    return await createUser({
        email,
        name,
        oauthProvider,
        oauthId,
    });
};

/**
 * Update user
 */
export const updateUser = async (
    id: string,
    updates: Partial<Pick<User, 'email' | 'name'>>
): Promise<User> => {
    const pool = getDbPool();
    
    const updatesList: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (updates.email) {
        updatesList.push(`email = $${paramIndex++}`);
        values.push(updates.email);
    }
    
    if (updates.name) {
        updatesList.push(`name = $${paramIndex++}`);
        values.push(updates.name);
    }
    
    updatesList.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const query = `
        UPDATE users
        SET ${updatesList.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return mapRowToUser(result.rows[0]);
};

/**
 * Delete user
 */
export const deleteUser = async (id: string): Promise<boolean> => {
    const pool = getDbPool();
    const result = await pool.query(
        'DELETE FROM users WHERE id = $1',
        [id]
    );
    
    return (result.rowCount ?? 0) > 0;
};

/**
 * Map database row to User interface
 */
function mapRowToUser(row: any): User {
    return {
        id: row.id,
        email: row.email,
        name: row.name,
        oauthProvider: row.oauth_provider,
        oauthId: row.oauth_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

/**
 * Close database connection
 */
export const closeDbPool = async (): Promise<void> => {
    if (pool) {
        await pool.end();
        pool = null;
    }
};
