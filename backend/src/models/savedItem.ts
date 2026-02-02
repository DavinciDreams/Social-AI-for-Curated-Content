import { Pool } from 'pg';
import { getDbPool } from './user';

/**
 * Saved item interface
 */
export interface SavedItem {
    id: string;
    feedItemId: string;
    userId: string;
    notes?: string;
    savedAt: Date;
    feedItem?: {
        id: string;
        title?: string;
        content?: string;
        source: string;
        url?: string;
        publishedAt?: Date;
        relevanceScore?: number;
    };
}

/**
 * Create saved item input interface
 */
export interface CreateSavedItemInput {
    feedItemId: string;
    userId: string;
    notes?: string;
}

/**
 * Initialize saved_items table
 */
export const initializeSavedItemsTable = async (): Promise<void> => {
    const pool = getDbPool();
    
    await pool.query(`
        CREATE TABLE IF NOT EXISTS saved_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            feed_item_id UUID NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            notes TEXT,
            saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, feed_item_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_saved_items_user_id ON saved_items(user_id);
        CREATE INDEX IF NOT EXISTS idx_saved_items_feed_item_id ON saved_items(feed_item_id);
        CREATE INDEX IF NOT EXISTS idx_saved_items_saved_at ON saved_items(saved_at DESC);
    `);
};

/**
 * Find saved item by ID
 */
export const findSavedItemById = async (id: string): Promise<SavedItem | null> => {
    const pool = getDbPool();
    const result = await pool.query(
        `SELECT si.*, f.title, f.content, f.source, f.url, f.published_at, f.relevance_score
         FROM saved_items si
         LEFT JOIN feeds f ON si.feed_item_id = f.id
         WHERE si.id = $1`,
        [id]
    );
    
    if (result.rows.length === 0) {
        return null;
    }
    
    return mapRowToSavedItem(result.rows[0]);
};

/**
 * Find saved item by user and feed item
 */
export const findSavedItemByUserAndFeed = async (
    userId: string,
    feedItemId: string
): Promise<SavedItem | null> => {
    const pool = getDbPool();
    const result = await pool.query(
        `SELECT si.*, f.title, f.content, f.source, f.url, f.published_at, f.relevance_score
         FROM saved_items si
         LEFT JOIN feeds f ON si.feed_item_id = f.id
         WHERE si.user_id = $1 AND si.feed_item_id = $2`,
        [userId, feedItemId]
    );
    
    if (result.rows.length === 0) {
        return null;
    }
    
    return mapRowToSavedItem(result.rows[0]);
};

/**
 * Check if an item is saved by a user
 */
export const isItemSaved = async (
    userId: string,
    feedItemId: string
): Promise<boolean> => {
    const pool = getDbPool();
    const result = await pool.query(
        'SELECT 1 FROM saved_items WHERE user_id = $1 AND feed_item_id = $2',
        [userId, feedItemId]
    );
    
    return result.rows.length > 0;
};

/**
 * Create a new saved item
 */
export const createSavedItem = async (input: CreateSavedItemInput): Promise<SavedItem> => {
    const pool = getDbPool();
    const result = await pool.query(
        `INSERT INTO saved_items (feed_item_id, user_id, notes)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [input.feedItemId, input.userId, input.notes]
    );
    
    // Fetch the full saved item with feed data
    return await findSavedItemById(result.rows[0].id) as SavedItem;
};

/**
 * Get saved items for a user with pagination
 */
export const getSavedItemsByUser = async (
    userId: string,
    page: number = 1,
    limit: number = 20
): Promise<{ items: SavedItem[]; total: number; page: number; totalPages: number }> => {
    const pool = getDbPool();
    const offset = (page - 1) * limit;
    
    // Get total count
    const countResult = await pool.query(
        'SELECT COUNT(*) as total FROM saved_items WHERE user_id = $1',
        [userId]
    );
    
    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);
    
    // Get saved items with feed data
    const result = await pool.query(
        `SELECT si.*, f.title, f.content, f.source, f.url, f.published_at, f.relevance_score
         FROM saved_items si
         LEFT JOIN feeds f ON si.feed_item_id = f.id
         WHERE si.user_id = $1
         ORDER BY si.saved_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
    );
    
    return {
        items: result.rows.map(mapRowToSavedItem),
        total,
        page,
        totalPages,
    };
};

/**
 * Update saved item notes
 */
export const updateSavedItemNotes = async (
    id: string,
    notes: string
): Promise<SavedItem> => {
    const pool = getDbPool();
    const result = await pool.query(
        `UPDATE saved_items
         SET notes = $1
         WHERE id = $2
         RETURNING *`,
        [notes, id]
    );
    
    return mapRowToSavedItem(result.rows[0]);
};

/**
 * Delete saved item
 */
export const deleteSavedItem = async (id: string): Promise<boolean> => {
    const pool = getDbPool();
    const result = await pool.query(
        'DELETE FROM saved_items WHERE id = $1',
        [id]
    );
    
    return (result.rowCount ?? 0) > 0;
};

/**
 * Delete saved item by user and feed item
 */
export const deleteSavedItemByUserAndFeed = async (
    userId: string,
    feedItemId: string
): Promise<boolean> => {
    const pool = getDbPool();
    const result = await pool.query(
        'DELETE FROM saved_items WHERE user_id = $1 AND feed_item_id = $2',
        [userId, feedItemId]
    );
    
    return (result.rowCount ?? 0) > 0;
};

/**
 * Map database row to SavedItem interface
 */
function mapRowToSavedItem(row: any): SavedItem {
    return {
        id: row.id,
        feedItemId: row.feed_item_id,
        userId: row.user_id,
        notes: row.notes,
        savedAt: row.saved_at,
        feedItem: row.title ? {
            id: row.feed_item_id,
            title: row.title,
            content: row.content,
            source: row.source,
            url: row.url,
            publishedAt: row.published_at,
            relevanceScore: row.relevance_score,
        } : undefined,
    };
}
