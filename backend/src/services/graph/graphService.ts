import {
    initNeo4j,
    closeNeo4j,
    createEntityNode,
    createFeedNode,
    createUserNode,
    createMentionedInRelationship,
    createSavedByRelationship,
    createRelatedToRelationship,
    createInterestedInRelationship,
    getGraphData,
    getFeedsByEntity,
    getEntitiesByFeed,
    getUserSavedFeeds,
    getRelatedEntities,
    deleteNode,
    clearGraph,
    GraphQueryFilters,
    GraphViewData,
    EntityType,
    FeedNode,
    EntityNode,
    UserNode
} from '../../models/graph';
import { invalidateCachePattern, invalidateCacheKey } from '../../middleware/cache';

/**
 * Pagination options for graph queries
 */
export interface PaginationOptions {
    page: number;
    limit: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

/**
 * Cache TTL for graph queries (in seconds)
 */
const GRAPH_CACHE_TTL = 600; // 10 minutes

/**
 * In-memory cache for graph data (fallback when Redis is not available)
 */
const graphCache = new Map<string, {
    data: any;
    timestamp: number;
}>();

/**
 * Initialize the graph service
 */
export const initGraphService = (): void => {
    try {
        initNeo4j();
        console.log('Graph service initialized');
    } catch (error) {
        console.error('Failed to initialize graph service:', error);
        throw error;
    }
};

/**
 * Shutdown the graph service
 */
export const shutdownGraphService = async (): Promise<void> => {
    try {
        await closeNeo4j();
        console.log('Graph service shutdown complete');
    } catch (error) {
        console.error('Error shutting down graph service:', error);
        throw error;
    }
};

/**
 * Generate cache key for graph queries
 */
const generateGraphCacheKey = (operation: string, params: any): string => {
    const paramString = JSON.stringify(params);
    return `graph:${operation}:${paramString}`;
};

/**
 * Get cached graph data
 */
const getCachedGraphData = (key: string): any | null => {
    const cached = graphCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < GRAPH_CACHE_TTL * 1000) {
        console.log(`Using cached graph data for key: ${key}`);
        return cached.data;
    }
    return null;
};

/**
 * Set cached graph data
 */
const setCachedGraphData = (key: string, data: any): void => {
    graphCache.set(key, {
        data,
        timestamp: Date.now()
    });
};

/**
 * Create or update a feed and its associated entities
 */
export const createFeedWithEntities = async (
    feedData: Omit<FeedNode['properties'], 'created_at' | 'updated_at'>,
    entities: Array<{
        name: string;
        type: EntityType;
        confidence?: number;
    }>
): Promise<void> => {
    try {
        // Create or update the feed node
        const feedNode = await createFeedNode(feedData);

        // Create entity nodes and relationships
        for (const entityData of entities) {
            const entityNode = await createEntityNode(
                entityData.name,
                entityData.type,
                { confidence: entityData.confidence }
            );

            // Create MENTIONED_IN relationship
            await createMentionedInRelationship(
                entityNode.id,
                feedNode.id,
                { confidence: entityData.confidence, frequency: 1 }
            );
        }

        console.log(`Created feed ${feedData.id} with ${entities.length} entities`);
        
        // Invalidate feed-related cache
        await invalidateCachePattern('feeds*');
        await invalidateCachePattern('graph*');
    } catch (error) {
        console.error('Error creating feed with entities:', error);
        throw error;
    }
};

/**
 * Update a feed and its entities
 */
export const updateFeedWithEntities = async (
    feedData: Omit<FeedNode['properties'], 'created_at' | 'updated_at'>,
    entities: Array<{
        name: string;
        type: EntityType;
        confidence?: number;
    }>
): Promise<void> => {
    try {
        // Create or update the feed node
        const feedNode = await createFeedNode(feedData);

        // Get existing entities for this feed
        const existingEntities = await getEntitiesByFeed(feedData.id);

        // Delete old relationships (we'll recreate them)
        // Note: In production, you might want to be more selective about this

        // Create entity nodes and relationships
        for (const entityData of entities) {
            const entityNode = await createEntityNode(
                entityData.name,
                entityData.type,
                { confidence: entityData.confidence }
            );

            // Create or update MENTIONED_IN relationship
            await createMentionedInRelationship(
                entityNode.id,
                feedNode.id,
                { confidence: entityData.confidence, frequency: 1 }
            );
        }

        console.log(`Updated feed ${feedData.id} with ${entities.length} entities`);
        
        // Invalidate cache
        await invalidateCachePattern('graph*');
    } catch (error) {
        console.error('Error updating feed with entities:', error);
        throw error;
    }
};

/**
 * Save a feed for a user
 */
export const saveFeedForUser = async (feedId: string, userId: string): Promise<void> => {
    try {
        await createSavedByRelationship(feedId, userId, {
            saved_at: new Date().toISOString()
        });

        // Update user's interests based on saved feed entities
        const entities = await getEntitiesByFeed(feedId);
        for (const entity of entities) {
            await createInterestedInRelationship(userId, entity.id, {
                strength: 1.0
            });
        }

        console.log(`Saved feed ${feedId} for user ${userId}`);
        
        // Invalidate cache
        await invalidateCachePattern('saved*');
        await invalidateCachePattern('graph*');
    } catch (error) {
        console.error('Error saving feed for user:', error);
        throw error;
    }
};

/**
 * Unsave a feed for a user
 */
export const unsaveFeedForUser = async (feedId: string, userId: string): Promise<void> => {
    const session = (await import('../../models/graph')).getSession();

    try {
        await session.run(
            `
            MATCH (f:Feed {id: $feedId})-[r:SAVED_BY]->(u:User {id: $userId})
            DELETE r
            `,
            { feedId, userId }
        );

        console.log(`Unsaved feed ${feedId} for user ${userId}`);
        
        // Invalidate cache
        await invalidateCachePattern('saved*');
        await invalidateCachePattern('graph*');
    } catch (error) {
        console.error('Error unsaving feed for user:', error);
        throw error;
    } finally {
        await session.close();
    }
};

/**
 * Get graph data with filters and caching
 * Optimized for large graph queries
 */
export const getFilteredGraphData = async (
    filters: GraphQueryFilters = {},
    options: PaginationOptions = { page: 1, limit: 1000 }
): Promise<GraphViewData> => {
    try {
        const cacheKey = generateGraphCacheKey('filtered', { filters, options });
        const cached = getCachedGraphData(cacheKey);
        
        if (cached) {
            return cached;
        }

        const result = await getGraphData(filters);
        
        // Implement pagination for nodes and links
        const totalNodes = result.nodes.length;
        const totalLinks = result.links.length;
        const nodeStartIndex = (options.page - 1) * options.limit;
        const nodeEndIndex = nodeStartIndex + options.limit;
        
        const paginatedResult: GraphViewData = {
            nodes: result.nodes.slice(nodeStartIndex, nodeEndIndex),
            links: result.links
        };
        
        setCachedGraphData(cacheKey, paginatedResult);
        return paginatedResult;
    } catch (error) {
        console.error('Error getting filtered graph data:', error);
        throw error;
    }
};

/**
 * Get feeds related to an entity with pagination
 */
export const getEntityFeeds = async (
    entityName: string,
    options: PaginationOptions = { page: 1, limit: 20 }
): Promise<PaginatedResponse<FeedNode>> => {
    try {
        const cacheKey = generateGraphCacheKey('entityFeeds', { entityName, options });
        const cached = getCachedGraphData(cacheKey);
        
        if (cached) {
            return cached;
        }

        const allFeeds = await getFeedsByEntity(entityName);
        const total = allFeeds.length;
        const totalPages = Math.ceil(total / options.limit);
        const startIndex = (options.page - 1) * options.limit;
        const endIndex = startIndex + options.limit;
        
        const result: PaginatedResponse<FeedNode> = {
            items: allFeeds.slice(startIndex, endIndex),
            total,
            page: options.page,
            limit: options.limit,
            totalPages
        };
        
        setCachedGraphData(cacheKey, result);
        return result;
    } catch (error) {
        console.error('Error getting entity feeds:', error);
        throw error;
    }
};

/**
 * Get entities related to a feed with pagination
 */
export const getFeedEntities = async (
    feedId: string,
    options: PaginationOptions = { page: 1, limit: 20 }
): Promise<PaginatedResponse<EntityNode>> => {
    try {
        const cacheKey = generateGraphCacheKey('feedEntities', { feedId, options });
        const cached = getCachedGraphData(cacheKey);
        
        if (cached) {
            return cached;
        }

        const allEntities = await getEntitiesByFeed(feedId);
        const total = allEntities.length;
        const totalPages = Math.ceil(total / options.limit);
        const startIndex = (options.page - 1) * options.limit;
        const endIndex = startIndex + options.limit;
        
        const result: PaginatedResponse<EntityNode> = {
            items: allEntities.slice(startIndex, endIndex),
            total,
            page: options.page,
            limit: options.limit,
            totalPages
        };
        
        setCachedGraphData(cacheKey, result);
        return result;
    } catch (error) {
        console.error('Error getting feed entities:', error);
        throw error;
    }
};

/**
 * Get related entities for a given entity with pagination
 */
export const getRelatedEntitiesList = async (
    entityName: string,
    limit = 10
): Promise<EntityNode[]> => {
    try {
        const cacheKey = generateGraphCacheKey('relatedEntities', { entityName, limit });
        const cached = getCachedGraphData(cacheKey);
        
        if (cached) {
            return cached;
        }

        const result = await getRelatedEntities(entityName, limit);
        setCachedGraphData(cacheKey, result);
        return result;
    } catch (error) {
        console.error('Error getting related entities:', error);
        throw error;
    }
};

/**
 * Get user's saved feeds from graph with pagination
 */
export const getUserSavedGraphFeeds = async (
    userId: string,
    options: PaginationOptions = { page: 1, limit: 20 }
): Promise<PaginatedResponse<FeedNode>> => {
    try {
        const cacheKey = generateGraphCacheKey('userSavedFeeds', { userId, options });
        const cached = getCachedGraphData(cacheKey);
        
        if (cached) {
            return cached;
        }

        const allFeeds = await getUserSavedFeeds(userId);
        const total = allFeeds.length;
        const totalPages = Math.ceil(total / options.limit);
        const startIndex = (options.page - 1) * options.limit;
        const endIndex = startIndex + options.limit;
        
        const result: PaginatedResponse<FeedNode> = {
            items: allFeeds.slice(startIndex, endIndex),
            total,
            page: options.page,
            limit: options.limit,
            totalPages
        };
        
        setCachedGraphData(cacheKey, result);
        return result;
    } catch (error) {
        console.error('Error getting user saved feeds:', error);
        throw error;
    }
};

/**
 * Find related feeds based on entity overlap with pagination
 */
export const findRelatedFeeds = async (
    feedId: string,
    options: PaginationOptions = { page: 1, limit: 10 }
): Promise<PaginatedResponse<FeedNode>> => {
    const session = (await import('../../models/graph')).getSession();

    try {
        const cacheKey = generateGraphCacheKey('relatedFeeds', { feedId, options });
        const cached = getCachedGraphData(cacheKey);
        
        if (cached) {
            return cached;
        }

        const result = await session.run(
            `
            MATCH (f1:Feed {id: $feedId})<-[:MENTIONED_IN]-(e:Entity)-[:MENTIONED_IN]->(f2:Feed)
            WHERE f1 <> f2
            WITH f2, count(e) as commonEntities
            RETURN f2, commonEntities
            ORDER BY commonEntities DESC
            LIMIT $limit
            `,
            { feedId, limit: options.limit }
        );

        const feeds: FeedNode[] = [];
        for (const record of result.records) {
            const node = record.get('f2');
            feeds.push({
                id: node.elementId,
                labels: node.labels,
                properties: node.properties
            } as FeedNode);
        }

        const paginatedResult: PaginatedResponse<FeedNode> = {
            items: feeds,
            total: feeds.length,
            page: options.page,
            limit: options.limit,
            totalPages: 1
        };
        
        setCachedGraphData(cacheKey, paginatedResult);
        return paginatedResult;
    } catch (error) {
        console.error('Error finding related feeds:', error);
        throw error;
    } finally {
        await session.close();
    }
};

/**
 * Get trending entities with caching
 */
export const getTrendingEntities = async (limit = 20): Promise<EntityNode[]> => {
    const session = (await import('../../models/graph')).getSession();

    try {
        const cacheKey = generateGraphCacheKey('trendingEntities', { limit });
        const cached = getCachedGraphData(cacheKey);
        
        if (cached) {
            return cached;
        }

        const result = await session.run(
            `
            MATCH (e:Entity)-[:MENTIONED_IN]->(f:Feed)
            WHERE f.pubDate >= datetime() - duration('P7D')
            WITH e, count(f) as mentionCount
            ORDER BY mentionCount DESC
            LIMIT $limit
            RETURN e, mentionCount
            `,
            { limit }
        );

        const entities: EntityNode[] = [];
        for (const record of result.records) {
            const node = record.get('e');
            entities.push({
                id: node.elementId,
                labels: node.labels,
                properties: node.properties
            } as EntityNode);
        }

        setCachedGraphData(cacheKey, entities);
        return entities;
    } catch (error) {
        console.error('Error getting trending entities:', error);
        throw error;
    } finally {
        await session.close();
    }
};

/**
 * Get entity statistics with caching
 */
export const getEntityStats = async (): Promise<{
    totalEntities: number;
    entitiesByType: Record<string, number>;
    totalFeeds: number;
    totalRelationships: number;
}> => {
    const session = (await import('../../models/graph')).getSession();

    try {
        const cacheKey = generateGraphCacheKey('entityStats', {});
        const cached = getCachedGraphData(cacheKey);
        
        if (cached) {
            return cached;
        }

        const result = await session.run(
            `
            MATCH (e:Entity)
            WITH count(e) as totalEntities
            MATCH (e:Entity)
            WITH totalEntities, e.type as type, count(e) as count
            RETURN totalEntities, collect({type: type, count: count}) as entitiesByType
            `
        );

        const record = result.records[0];
        const totalEntities = record.get('totalEntities').toNumber();
        const entitiesByTypeList = record.get('entitiesByType');

        const entitiesByType: Record<string, number> = {};
        for (const item of entitiesByTypeList) {
            entitiesByType[item.type] = item.count.toNumber();
        }

        // Get total feeds and relationships
        const statsResult = await session.run(
            `
            MATCH (f:Feed)
            WITH count(f) as totalFeeds
            MATCH ()-[r]->()
            RETURN totalFeeds, count(r) as totalRelationships
            `
        );

        const statsRecord = statsResult.records[0];
        const totalFeeds = statsRecord.get('totalFeeds').toNumber();
        const totalRelationships = statsRecord.get('totalRelationships').toNumber();

        const stats = {
            totalEntities,
            entitiesByType,
            totalFeeds,
            totalRelationships
        };
        
        setCachedGraphData(cacheKey, stats);
        return stats;
    } catch (error) {
        console.error('Error getting entity stats:', error);
        throw error;
    } finally {
        await session.close();
    }
};

/**
 * Search entities by name with caching
 */
export const searchEntities = async (
    query: string,
    limit = 10
): Promise<EntityNode[]> => {
    const session = (await import('../../models/graph')).getSession();

    try {
        const cacheKey = generateGraphCacheKey('searchEntities', { query, limit });
        const cached = getCachedGraphData(cacheKey);
        
        if (cached) {
            return cached;
        }

        const result = await session.run(
            `
            MATCH (e:Entity)
            WHERE e.name CONTAINS $query OR e.normalized_name CONTAINS $query
            RETURN e
            ORDER BY e.confidence DESC
            LIMIT $limit
            `,
            { query: query.toLowerCase(), limit }
        );

        const entities: EntityNode[] = [];
        for (const record of result.records) {
            const node = record.get('e');
            entities.push({
                id: node.elementId,
                labels: node.labels,
                properties: node.properties
            } as EntityNode);
        }

        setCachedGraphData(cacheKey, entities);
        return entities;
    } catch (error) {
        console.error('Error searching entities:', error);
        throw error;
    } finally {
        await session.close();
    }
};

/**
 * Delete a node from the graph
 */
export const deleteGraphNode = async (nodeId: string): Promise<boolean> => {
    try {
        const result = await deleteNode(nodeId);
        
        // Invalidate cache
        await invalidateCachePattern('graph*');
        
        return result;
    } catch (error) {
        console.error('Error deleting graph node:', error);
        throw error;
    }
};

/**
 * Clear all graph data (use with caution)
 */
export const clearAllGraphData = async (): Promise<void> => {
    try {
        await clearGraph();
        
        // Clear in-memory cache
        graphCache.clear();
        
        // Invalidate Redis cache
        await invalidateCachePattern('graph*');
        
        console.log('All graph data and cache cleared');
    } catch (error) {
        console.error('Error clearing graph data:', error);
        throw error;
    }
};
