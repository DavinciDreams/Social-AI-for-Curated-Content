import {
    createSavedItem,
    deleteSavedItemByUserAndFeed,
    getSavedItemsByUser,
    isItemSaved,
    SavedItem,
    CreateSavedItemInput,
} from '../../models/savedItem';

/**
 * Save an item for a user
 */
export const saveItem = async (
    userId: string,
    feedItemId: string,
    notes?: string
): Promise<SavedItem> => {
    // Check if item is already saved
    const existing = await isItemSaved(userId, feedItemId);
    
    if (existing) {
        throw new Error('Item is already saved');
    }
    
    return await createSavedItem({
        feedItemId,
        userId,
        notes,
    });
};

/**
 * Unsave an item for a user
 */
export const unsaveItem = async (
    userId: string,
    feedItemId: string
): Promise<boolean> => {
    const deleted = await deleteSavedItemByUserAndFeed(userId, feedItemId);
    
    if (!deleted) {
        throw new Error('Item is not saved');
    }
    
    return true;
};

/**
 * Get user's saved items with pagination
 */
export const getSavedItems = async (
    userId: string,
    page: number = 1,
    limit: number = 20
): Promise<{ items: SavedItem[]; total: number; page: number; totalPages: number }> => {
    return await getSavedItemsByUser(userId, page, limit);
};

/**
 * Check if an item is saved by a user
 */
export const checkIsSaved = async (
    userId: string,
    feedItemId: string
): Promise<{ isSaved: boolean }> => {
    const saved = await isItemSaved(userId, feedItemId);
    return { isSaved: saved };
};
