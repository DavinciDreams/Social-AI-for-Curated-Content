import { Request, Response } from 'express';
import {
    saveItem,
    unsaveItem,
    getSavedItems,
    checkIsSaved,
} from './savedService';

/**
 * Save an item
 */
export const saveItemController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        
        const { feedItemId, notes } = req.body;
        
        if (!feedItemId) {
            res.status(400).json({ error: 'feedItemId is required' });
            return;
        }
        
        const savedItem = await saveItem(req.user.id, feedItemId, notes);
        
        res.status(201).json({
            success: true,
            data: savedItem,
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'Item is already saved') {
            res.status(409).json({ error: error.message });
        } else {
            console.error('Save item error:', error);
            res.status(500).json({ error: 'Failed to save item' });
        }
    }
};

/**
 * Unsave an item
 */
export const unsaveItemController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        
        const { id } = req.params;
        const { feedItemId } = req.body;
        
        if (!feedItemId) {
            res.status(400).json({ error: 'feedItemId is required' });
            return;
        }
        
        await unsaveItem(req.user.id, feedItemId);
        
        res.json({
            success: true,
            message: 'Item unsaved successfully',
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'Item is not saved') {
            res.status(404).json({ error: error.message });
        } else {
            console.error('Unsave item error:', error);
            res.status(500).json({ error: 'Failed to unsave item' });
        }
    }
};

/**
 * Get saved items
 */
export const getSavedItemsController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        
        const result = await getSavedItems(req.user.id, page, limit);
        
        res.json({
            success: true,
            ...result,
        });
    } catch (error) {
        console.error('Get saved items error:', error);
        res.status(500).json({ error: 'Failed to get saved items' });
    }
};

/**
 * Check if an item is saved
 */
export const checkIsSavedController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        
        const { feedItemId } = req.params;
        
        if (!feedItemId) {
            res.status(400).json({ error: 'feedItemId is required' });
            return;
        }
        
        const result = await checkIsSaved(req.user.id, feedItemId);
        
        res.json({
            success: true,
            ...result,
        });
    } catch (error) {
        console.error('Check is saved error:', error);
        res.status(500).json({ error: 'Failed to check if item is saved' });
    }
};
