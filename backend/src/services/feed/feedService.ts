import Parser from 'rss-parser';
import { filterContent } from '../filter/filterService';
import config from '../../config/config';
import { extractEntitiesFromFeed } from '../entity/entityService';
import { createFeedWithEntities, updateFeedWithEntities } from '../graph/graphService';
import { EntityType } from '../entity/entityService';
import { cacheMiddleware, invalidateCachePattern, invalidateCacheKey } from '../../middleware/cache';

const parser = new Parser();

export interface FeedItem {
    id?: string;
    title?: string;
    link?: string;
    content?: string;
    pubDate?: string;
    source: string;
    aiScore?: number;
    reasoning?: string;
}

export interface PaginationOptions {
    page: number;
    limit: number;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

import { fetchTwitterFeed } from '../social/twitterService';
import { fetchRedditFeed } from '../social/redditService';

/**
 * Cache key for feed aggregation
 */
const FEED_CACHE_KEY = 'feeds:aggregated';
const FEED_CACHE_TTL = 300; // 5 minutes

/**
 * In-memory cache for feed aggregation (fallback when Redis is not available)
 */
let feedCache: {
    data: {
        items: FeedItem[];
        total: number;
    };
    timestamp: number;
} | null = null;

/**
 * Fetch and aggregate feeds from all sources
 * Implements caching for improved performance
 */
export const fetchFeeds = async (options: PaginationOptions = { page: 1, limit: 20 }): Promise<PaginatedResponse<FeedItem>> => {
    try {
        const allItems: FeedItem[] = [];

        // 1. Fetch RSS Feeds
        for (const feedConfig of config.feeds) {
            try {
                const feed = await parser.parseURL(feedConfig.url);

                const rssItems: FeedItem[] = feed.items.map(item => ({
                    title: item.title,
                    link: item.link,
                    content: item.content || item.contentSnippet,
                    pubDate: item.pubDate,
                    source: feedConfig.name
                }));
                allItems.push(...rssItems);
            } catch (err) {
                console.error(`Error fetching feed ${feedConfig.name}:`, err);
                // Continue to next feed even if one fails
            }
        }

        // 2. Fetch Twitter
        try {
            const tweets = await fetchTwitterFeed();
            console.log(`Debug: Fetched ${tweets.length} tweets from Twitter Service`);
            allItems.push(...tweets);
        } catch (e) {
            console.error("Debug: Failed to fetch tweets in feedService", e);
        }

        // 3. Fetch Reddit
        try {
            const redditPosts = await fetchRedditFeed();
            console.log(`Debug: Fetched ${redditPosts.length} reddit posts from Reddit Service`);
            allItems.push(...redditPosts);
        } catch (e) {
            console.error("Debug: Failed to fetch reddit posts in feedService", e);
        }

        console.log(`Debug: Total items before AI Filter: ${allItems.length}`);

        // 4. AI Filter & Process All Items
        const processedItems = await Promise.all(allItems.map(async (item): Promise<FeedItem | null> => {
            // Ensure content is not undefined for analysis
            const textToAnalyze = `${item.title || ''} ${item.content || ''}`;
            
            try {
                // TODO: Pass system prompt from config to filterService if API supports it
                const analysis = await filterContent(textToAnalyze);

                if (analysis.is_brain_rot) {
                    console.log(`Debug: Filtered out item: ${item.title?.substring(0, 30)}...`);
                    return null;
                }

                // Extract entities from the feed content
                const entities = await extractEntitiesFromFeed(item.title || '', item.content);
                
                // Create a unique ID for the feed item
                const feedId = item.link || `${item.source}-${Date.now()}`;
                
                // Store feed and entities in Neo4j graph
                try {
                    await createFeedWithEntities(
                        {
                            id: feedId,
                            title: item.title || '',
                            link: item.link || '',
                            content: item.content,
                            source: item.source,
                            pubDate: item.pubDate,
                            aiScore: analysis.score,
                            reasoning: analysis.reasoning
                        },
                        entities.map(e => ({
                            name: e.name,
                            type: e.type as EntityType,
                            confidence: e.confidence
                        }))
                    );
                } catch (graphError) {
                    console.error('Error storing feed in graph:', graphError);
                    // Continue even if graph storage fails
                }

                return {
                    ...item,
                    id: feedId,
                    aiScore: analysis.score,
                    reasoning: analysis.reasoning
                };
            } catch (err) {
                console.error("Debug: Error in AI filter loop", err);
                return item; // Fallback to keeping it if AI fails
            }
        }));

        const validItems = processedItems.filter((item): item is FeedItem => item !== null);
        console.log(`Debug: Total items after AI Filter: ${validItems.length}`);

        // Sort by publication date
        const sortedItems = validItems.sort((a, b) => {
            return new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime();
        });

        // Implement pagination
        const total = sortedItems.length;
        const totalPages = Math.ceil(total / options.limit);
        const startIndex = (options.page - 1) * options.limit;
        const endIndex = startIndex + options.limit;
        const paginatedItems = sortedItems.slice(startIndex, endIndex);

        return {
            items: paginatedItems,
            total,
            page: options.page,
            limit: options.limit,
            totalPages
        };

    } catch (error) {
        console.error('Error fetching feeds:', error);
        throw error;
    }
};

/**
 * Fetch feeds with caching
 * Optimized for production performance
 */
export const fetchFeedsCached = async (options: PaginationOptions = { page: 1, limit: 20 }): Promise<PaginatedResponse<FeedItem>> => {
    const now = Date.now();
    
    // Check in-memory cache first (fallback)
    if (feedCache && (now - feedCache.timestamp) < FEED_CACHE_TTL * 1000) {
        console.log('Using in-memory feed cache');
        const { items, total } = feedCache.data;
        const totalPages = Math.ceil(total / options.limit);
        const startIndex = (options.page - 1) * options.limit;
        const endIndex = startIndex + options.limit;
        
        return {
            items: items.slice(startIndex, endIndex),
            total,
            page: options.page,
            limit: options.limit,
            totalPages
        };
    }

    // Fetch fresh data
    const result = await fetchFeeds(options);
    
    // Update cache
    feedCache = {
        data: {
            items: result.items,
            total: result.total
        },
        timestamp: now
    };

    return result;
};

/**
 * Invalidate feed cache
 * Call this when feeds are updated or new content is added
 */
export const invalidateFeedCache = async (): Promise<void> => {
    feedCache = null;
    await invalidateCachePattern('feeds*');
    console.log('Feed cache invalidated');
};

/**
 * Get feeds by source with pagination
 * Optimized database query with filtering
 */
export const getFeedsBySource = async (
    source: string,
    options: PaginationOptions = { page: 1, limit: 20 }
): Promise<PaginatedResponse<FeedItem>> => {
    try {
        const allFeeds = await fetchFeedsCached({ page: 1, limit: 1000 }); // Get all feeds
        
        const filteredFeeds = allFeeds.items.filter(item => item.source === source);
        const total = filteredFeeds.length;
        const totalPages = Math.ceil(total / options.limit);
        const startIndex = (options.page - 1) * options.limit;
        const endIndex = startIndex + options.limit;

        return {
            items: filteredFeeds.slice(startIndex, endIndex),
            total,
            page: options.page,
            limit: options.limit,
            totalPages
        };
    } catch (error) {
        console.error('Error getting feeds by source:', error);
        throw error;
    }
};

/**
 * Get feeds by date range with pagination
 * Optimized for time-based queries
 */
export const getFeedsByDateRange = async (
    startDate: Date,
    endDate: Date,
    options: PaginationOptions = { page: 1, limit: 20 }
): Promise<PaginatedResponse<FeedItem>> => {
    try {
        const allFeeds = await fetchFeedsCached({ page: 1, limit: 1000 });
        
        const filteredFeeds = allFeeds.items.filter(item => {
            if (!item.pubDate) return false;
            const itemDate = new Date(item.pubDate);
            return itemDate >= startDate && itemDate <= endDate;
        });
        
        const total = filteredFeeds.length;
        const totalPages = Math.ceil(total / options.limit);
        const startIndex = (options.page - 1) * options.limit;
        const endIndex = startIndex + options.limit;

        return {
            items: filteredFeeds.slice(startIndex, endIndex),
            total,
            page: options.page,
            limit: options.limit,
            totalPages
        };
    } catch (error) {
        console.error('Error getting feeds by date range:', error);
        throw error;
    }
};

/**
 * Get feeds by minimum AI score with pagination
 * Optimized for quality filtering
 */
export const getFeedsByMinScore = async (
    minScore: number,
    options: PaginationOptions = { page: 1, limit: 20 }
): Promise<PaginatedResponse<FeedItem>> => {
    try {
        const allFeeds = await fetchFeedsCached({ page: 1, limit: 1000 });
        
        const filteredFeeds = allFeeds.items.filter(item => 
            item.aiScore !== undefined && item.aiScore >= minScore
        );
        
        const total = filteredFeeds.length;
        const totalPages = Math.ceil(total / options.limit);
        const startIndex = (options.page - 1) * options.limit;
        const endIndex = startIndex + options.limit;

        return {
            items: filteredFeeds.slice(startIndex, endIndex),
            total,
            page: options.page,
            limit: options.limit,
            totalPages
        };
    } catch (error) {
        console.error('Error getting feeds by min score:', error);
        throw error;
    }
};
