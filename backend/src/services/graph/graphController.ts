import { Request, Response, NextFunction } from 'express';
import {
    getFilteredGraphData,
    getEntityFeeds,
    getFeedEntities,
    getRelatedEntitiesList,
    getUserSavedGraphFeeds,
    findRelatedFeeds,
    getTrendingEntities,
    getEntityStats,
    searchEntities,
    saveFeedForUser,
    unsaveFeedForUser,
    deleteGraphNode,
    clearAllGraphData
} from './graphService';
import { EntityType } from '../../models/graph';

/**
 * Get graph data for visualization
 */
export const getGraph = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const filters = {
            entityTypes: req.query.entityTypes
                ? (req.query.entityTypes as string).split(',').map(type => EntityType[type as keyof typeof EntityType])
                : undefined,
            sources: req.query.sources
                ? (req.query.sources as string).split(',')
                : undefined,
            dateRange: req.query.startDate && req.query.endDate
                ? {
                    start: req.query.startDate as string,
                    end: req.query.endDate as string
                }
                : undefined,
            limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
        };

        const graphData = await getFilteredGraphData(filters);
        res.json({
            success: true,
            data: graphData
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get feeds related to an entity
 */
export const getFeedsByEntityName = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { entityName } = req.params;

        if (!entityName) {
            res.status(400).json({
                success: false,
                error: 'Entity name is required'
            });
            return;
        }

        const feeds = await getEntityFeeds(entityName);
        res.json({
            success: true,
            data: feeds
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get entities related to a feed
 */
export const getEntitiesByFeedId = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { feedId } = req.params;

        if (!feedId) {
            res.status(400).json({
                success: false,
                error: 'Feed ID is required'
            });
            return;
        }

        const entities = await getFeedEntities(feedId);
        res.json({
            success: true,
            data: entities
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get related entities for a given entity
 */
export const getRelatedEntities = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { entityName } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

        if (!entityName) {
            res.status(400).json({
                success: false,
                error: 'Entity name is required'
            });
            return;
        }

        const entities = await getRelatedEntitiesList(entityName, limit);
        res.json({
            success: true,
            data: entities
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get user's saved feeds from graph
 */
export const getUserSavedFeedsGraph = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
            return;
        }

        const feeds = await getUserSavedGraphFeeds(userId);
        res.json({
            success: true,
            data: feeds
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Find related feeds based on entity overlap
 */
export const getRelatedFeeds = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { feedId } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

        if (!feedId) {
            res.status(400).json({
                success: false,
                error: 'Feed ID is required'
            });
            return;
        }

        const feeds = await findRelatedFeeds(feedId, { limit, page: 1 });
        res.json({
            success: true,
            data: feeds
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get trending entities
 */
export const getTrendingEntitiesList = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

        const entities = await getTrendingEntities(limit);
        res.json({
            success: true,
            data: entities
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get entity statistics
 */
export const getGraphStats = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const stats = await getEntityStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Search entities by name
 */
export const searchEntitiesByName = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { query } = req.query;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

        if (!query || typeof query !== 'string') {
            res.status(400).json({
                success: false,
                error: 'Search query is required'
            });
            return;
        }

        const entities = await searchEntities(query, limit);
        res.json({
            success: true,
            data: entities
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Save a feed for a user
 */
export const saveFeed = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { feedId } = req.body;

        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
            return;
        }

        if (!feedId) {
            res.status(400).json({
                success: false,
                error: 'Feed ID is required'
            });
            return;
        }

        await saveFeedForUser(feedId, userId);
        res.json({
            success: true,
            message: 'Feed saved successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Unsave a feed for a user
 */
export const unsaveFeed = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { feedId } = req.params;

        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
            return;
        }

        if (!feedId) {
            res.status(400).json({
                success: false,
                error: 'Feed ID is required'
            });
            return;
        }

        await unsaveFeedForUser(feedId, userId);
        res.json({
            success: true,
            message: 'Feed unsaved successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a node from the graph
 */
export const deleteNode = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { nodeId } = req.params;

        if (!nodeId) {
            res.status(400).json({
                success: false,
                error: 'Node ID is required'
            });
            return;
        }

        const deleted = await deleteGraphNode(nodeId);

        if (deleted) {
            res.json({
                success: true,
                message: 'Node deleted successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Node not found'
            });
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Clear all graph data (admin only)
 */
export const clearGraph = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // This should be protected by admin middleware in production
        await clearAllGraphData();
        res.json({
            success: true,
            message: 'Graph cleared successfully'
        });
    } catch (error) {
        next(error);
    }
};
