import { Pool } from 'pg';
import { getDbPool } from './user';

/**
 * Feed item interface
 */
export interface FeedItem {
    id: string;
    title?: string;
    content?: string;
    source: string;
    url?: string;
    publishedAt?: Date;
    relevanceScore?: number;
    userId?: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Create feed input interface
 */
export interface CreateFeedInput {
    title?: string;
    content?: string;
    source: string;
    url?: string;
    publishedAt?: Date;
    relevanceScore?: number;
    userId?: string;
}

/**
 * Initialize feeds table
 */
export const initializeFeedsTable = async (): Promise<void> => {
    const pool = getDbPool();
    
    await pool.query(`
        CREATE TABLE IF NOT EXISTS feeds (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title TEXT,
            content TEXT,
            source VARCHAR(255) NOT NULL,
            url TEXT,
            published_at TIMESTAMP WITH TIME ZONE,
            relevance_score DECIMAL(5, 2),
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_feeds_source ON feeds(source);
        CREATE INDEX IF NOT EXISTS idx_feeds_published_at ON feeds(published_at DESC);
        CREATE INDEX IF NOT EXISTS idx_feeds_user_id ON feeds(user_id);
        CREATE INDEX IF NOT EXISTS idx_feeds_relevance_score ON feeds(relevance_score DESC);
    `);
};

/**
 * Find feed item by ID
 */
export const findFeedById = async (id: string): Promise<FeedItem | null> => {
    const pool = getDbPool();
    const result = await pool.query(
        'SELECT * FROM feeds WHERE id = $1',
        [id]
    );
    
    if (result.rows.length === 0) {
        return null;
    }
    
    return mapRowToFeedItem(result.rows[0]);
};

/**
 * Find feed item by URL (to avoid duplicates)
 */
export const findFeedByUrl = async (url: string): Promise<FeedItem | null> => {
    const pool = getDbPool();
    const result = await pool.query(
        'SELECT * FROM feeds WHERE url = $1',
        [url]
    );
    
    if (result.rows.length === 0) {
        return null;
    }
    
    return mapRowToFeedItem(result.rows[0]);
};

/**
 * Create a new feed item
 */
export const createFeed = async (input: CreateFeedInput): Promise<FeedItem> => {
    const pool = getDbPool();
    const result = await pool.query(
        `INSERT INTO feeds (title, content, source, url, published_at, relevance_score, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
            input.title,
            input.content,
            input.source,
            input.url,
            input.publishedAt,
            input.relevanceScore,
            input.userId,
        ]
    );
    
    return mapRowToFeedItem(result.rows[0]);
};

/**
 * Create or update feed item (upsert based on URL)
 */
export const createOrUpdateFeed = async (
    input: CreateFeedInput
): Promise<FeedItem> => {
    const pool = getDbPool();
    
    // Check if feed item exists
    if (input.url) {
        const existing = await findFeedByUrl(input.url);
        if (existing) {
            // Update existing feed item
            return await updateFeed(existing.id, input);
        }
    }
    
    // Create new feed item
    return await createFeed(input);
};

/**
 * Update feed item
 */
export const updateFeed = async (
    id: string,
    updates: Partial<Omit<CreateFeedInput, 'source'>>
): Promise<FeedItem> => {
    const pool = getDbPool();
    
    const updatesList: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (updates.title !== undefined) {
        updatesList.push(`title = $${paramIndex++}`);
        values.push(updates.title);
    }
    
    if (updates.content !== undefined) {
        updatesList.push(`content = $${paramIndex++}`);
        values.push(updates.content);
    }
    
    if (updates.url !== undefined) {
        updatesList.push(`url = $${paramIndex++}`);
        values.push(updates.url);
    }
    
    if (updates.publishedAt !== undefined) {
        updatesList.push(`published_at = $${paramIndex++}`);
        values.push(updates.publishedAt);
    }
    
    if (updates.relevanceScore !== undefined) {
        updatesList.push(`relevance_score = $${paramIndex++}`);
        values.push(updates.relevanceScore);
    }
    
    if (updates.userId !== undefined) {
        updatesList.push(`user_id = $${paramIndex++}`);
        values.push(updates.userId);
    }
    
    updatesList.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const query = `
        UPDATE feeds
        SET ${updatesList.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return mapRowToFeedItem(result.rows[0]);
};

/**
 * Get feed items with pagination
 */
export const getFeeds = async (
    page: number = 1,
    limit: number = 20,
    source?: string,
    userId?: string
): Promise<{ items: FeedItem[]; total: number; page: number; totalPages: number }> => {
    const pool = getDbPool();
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    const params: any[] = [limit, offset];
    
    if (source) {
        whereClause += ' AND source = $3';
        params.push(source);
    }
    
    if (userId) {
        whereClause += ' AND user_id = $' + (params.length + 1);
        params.push(userId);
    }
    
    const countResult = await pool.query(
        `SELECT COUNT(*) as total FROM feeds WHERE 1=1${whereClause}`,
        params.slice(2) // Skip limit and offset for count
    );
    
    const result = await pool.query(
        `SELECT * FROM feeds WHERE 1=1${whereClause}
         ORDER BY published_at DESC, created_at DESC
         LIMIT $1 OFFSET $2`,
        params
    );
    
    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);
    
    return {
        items: result.rows.map(mapRowToFeedItem),
        total,
        page,
        totalPages,
    };
};

/**
 * Delete feed item
 */
export const deleteFeed = async (id: string): Promise<boolean> => {
    const pool = getDbPool();
    const result = await pool.query(
        'DELETE FROM feeds WHERE id = $1',
        [id]
    );
    
    return (result.rowCount ?? 0) > 0;
};

/**
 * Map database row to FeedItem interface
 */
function mapRowToFeedItem(row: any): FeedItem {
    return {
        id: row.id,
        title: row.title,
        content: row.content,
        source: row.source,
        url: row.url,
        publishedAt: row.published_at,
        relevanceScore: row.relevance_score,
        userId: row.user_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
