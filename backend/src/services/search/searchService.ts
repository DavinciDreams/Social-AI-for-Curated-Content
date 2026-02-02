import { Client } from '@elastic/elasticsearch';
import { invalidateCachePattern } from '../../middleware/cache';

// Elasticsearch client
let esClient: Client | null = null;

// Initialize Elasticsearch client
export const initializeElasticsearch = (): void => {
    const esHost = process.env.ELASTICSEARCH_HOST || 'localhost';
    const esPort = process.env.ELASTICSEARCH_PORT || '9200';

    esClient = new Client({
        node: `http://${esHost}:${esPort}`,
    });

    console.log('Elasticsearch client initialized');
};

// Get Elasticsearch client
export const getElasticsearchClient = (): Client => {
    if (!esClient) {
        initializeElasticsearch();
    }
    return esClient!;
};

// Cache TTL for search queries (in seconds)
const SEARCH_CACHE_TTL = 180; // 3 minutes

// In-memory cache for search results (fallback when Redis is not available)
const searchCache = new Map<string, {
    data: any;
    timestamp: number;
}>();

/**
 * Generate cache key for search queries
 */
const generateSearchCacheKey = (operation: string, params: any): string => {
    const paramString = JSON.stringify(params);
    return `search:${operation}:${paramString}`;
};

/**
 * Get cached search data
 */
const getCachedSearchData = (key: string): any | null => {
    const cached = searchCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < SEARCH_CACHE_TTL * 1000) {
        console.log(`Using cached search data for key: ${key}`);
        return cached.data;
    }
    return null;
};

/**
 * Set cached search data
 */
const setCachedSearchData = (key: string, data: any): void => {
    searchCache.set(key, {
        data,
        timestamp: Date.now()
    });
};

// Create index for feeds
export const createFeedIndex = async (): Promise<void> => {
    const client = getElasticsearchClient();

    const indexExists = await client.indices.exists({
        index: 'feeds',
    });

    if (!indexExists) {
        await client.indices.create({
            index: 'feeds',
            body: {
                mappings: {
                    properties: {
                        id: { type: 'keyword' },
                        title: { type: 'text', analyzer: 'standard' },
                        content: { type: 'text', analyzer: 'standard' },
                        link: { type: 'keyword' },
                        source: { type: 'keyword' },
                        pubDate: { type: 'date' },
                        aiScore: { type: 'float' },
                        isSaved: { type: 'boolean' },
                        createdAt: { type: 'date' },
                    },
                },
                settings: {
                    number_of_shards: 1,
                    number_of_replicas: 0,
                    // Optimized for search performance
                    'index.max_result_window': 10000,
                    'index.query.default_field': 'title',
                },
            },
        });
        console.log('Created feeds index in Elasticsearch');
    }
};

// Index a single feed item
export const indexFeed = async (feed: {
    id: string;
    title: string;
    content?: string;
    link?: string;
    source: string;
    pubDate?: string;
    aiScore?: number;
    isSaved?: boolean;
}): Promise<void> => {
    const client = getElasticsearchClient();

    await client.index({
        index: 'feeds',
        id: feed.id,
        body: {
            ...feed,
            createdAt: new Date().toISOString(),
        },
    });
};

// Index multiple feed items
export const indexFeeds = async (feeds: Array<{
    id: string;
    title: string;
    content?: string;
    link?: string;
    source: string;
    pubDate?: string;
    aiScore?: number;
    isSaved?: boolean;
}>): Promise<void> => {
    const client = getElasticsearchClient();

    const bulkBody = feeds.flatMap((feed) => [
        { index: { _index: 'feeds', _id: feed.id } },
        {
            ...feed,
            createdAt: new Date().toISOString(),
        },
    ]);

    await client.bulk({ body: bulkBody });
    console.log(`Indexed ${feeds.length} feeds in Elasticsearch`);
};

// Update an existing feed item
export const updateFeed = async (feedId: string, feed: {
    title?: string;
    content?: string;
    link?: string;
    aiScore?: number;
    isSaved?: boolean;
}): Promise<void> => {
    const client = getElasticsearchClient();

    await client.update({
        index: 'feeds',
        id: feedId,
        body: {
            doc: feed,
        },
    });
};

// Delete a feed item from index
export const deleteFeed = async (feedId: string): Promise<void> => {
    const client = getElasticsearchClient();

    await client.delete({
        index: 'feeds',
        id: feedId,
    });
};

// Search feeds with caching and pagination
export const searchFeeds = async (options: {
    query: string;
    filters?: {
        sources?: string[];
        dateRange?: {
            start?: string;
            end?: string;
        };
        minScore?: number;
        isSaved?: boolean;
    };
    sort?: {
        field: string;
        order: 'asc' | 'desc';
    };
    page?: number;
    limit?: number;
}): Promise<{
    items: Array<{
        id: string;
        title: string;
        content?: string;
        link?: string;
        source: string;
        pubDate?: string;
        aiScore?: number;
        isSaved?: boolean;
        score: number;
    }>;
    total: number;
    page: number;
    limit: number;
}> => {
    const client = getElasticsearchClient();

    const { query, filters, sort, page = 1, limit = 20 } = options;

    // Check cache first
    const cacheKey = generateSearchCacheKey('feeds', { query, filters, sort, page, limit });
    const cached = getCachedSearchData(cacheKey);
    
    if (cached) {
        return cached;
    }

    // Build optimized Elasticsearch query
    const must: any[] = [
        {
            multi_match: {
                query,
                fields: ['title^3', 'content^2', 'source'],
                type: 'best_fields',
                fuzziness: 'AUTO',
                // Optimized query parameters
                operator: 'or',
                max_expansions: 50,
            },
        },
    ];

    // Apply filters
    if (filters) {
        if (filters.sources && filters.sources.length > 0) {
            must.push({
                terms: { source: filters.sources },
            });
        }

        if (filters.dateRange) {
            const rangeQuery: any = {};
            if (filters.dateRange.start) {
                rangeQuery.gte = filters.dateRange.start;
            }
            if (filters.dateRange.end) {
                rangeQuery.lte = filters.dateRange.end;
            }
            if (Object.keys(rangeQuery).length > 0) {
                must.push({
                    range: { pubDate: rangeQuery },
                });
            }
        }

        if (filters.minScore !== undefined) {
            must.push({
                range: { aiScore: { gte: filters.minScore } },
            });
        }

        if (filters.isSaved !== undefined) {
            must.push({
                term: { isSaved: filters.isSaved },
            });
        }
    }

    // Build sort - using proper Elasticsearch Sort type
    const sortConfig = sort
        ? [{ [sort.field]: sort.order }]
        : [{ _score: { order: 'desc' } }, { pubDate: { order: 'desc' } }] as any;

    // Execute optimized search
    const result = await client.search({
        index: 'feeds',
        body: {
            query: {
                bool: {
                    must,
                },
            },
            sort: sortConfig,
            from: (page - 1) * limit,
            size: limit,
            highlight: {
                fields: {
                    title: {},
                    content: {},
                },
                fragment_size: 150,
                number_of_fragments: 1,
                pre_tags: ['<mark>'],
                post_tags: ['</mark>'],
            },
            // Performance optimization
            track_total_hits: true,
        },
    });

    // Format results
    const items = result.hits.hits.map((hit: any) => ({
        id: hit._id,
        ...hit._source,
        score: hit._score,
        highlights: hit.highlight,
    }));

    const total = typeof result.hits.total === 'number' 
        ? result.hits.total 
        : (result.hits.total as any).value;

    const response = {
        items,
        total,
        page,
        limit,
    };
    
    // Cache the result
    setCachedSearchData(cacheKey, response);
    
    return response;
};

// Autocomplete search with caching
export const autocompleteSearch = async (query: string, limit: number = 10): Promise<string[]> => {
    const client = getElasticsearchClient();

    // Check cache
    const cacheKey = generateSearchCacheKey('autocomplete', { query, limit });
    const cached = getCachedSearchData(cacheKey);
    
    if (cached) {
        return cached;
    }

    const result = await client.search({
        index: 'feeds',
        body: {
            query: {
                multi_match: {
                    query,
                    fields: ['title^5', 'content'],
                    type: 'phrase_prefix',
                    fuzziness: 'AUTO',
                },
            },
            size: limit,
            _source: ['title'],
        },
    });

    const suggestions = result.hits.hits.map((hit: any) => hit._source.title);
    
    // Cache the result
    setCachedSearchData(cacheKey, suggestions);
    
    return suggestions;
};

// Get trending feeds with caching
export const getTrendingFeeds = async (limit: number = 10, days: number = 7): Promise<Array<{
    id: string;
    title: string;
    content?: string;
    link?: string;
    source: string;
    pubDate?: string;
    aiScore?: number;
    isSaved?: boolean;
}>> => {
    const client = getElasticsearchClient();

    // Check cache
    const cacheKey = generateSearchCacheKey('trending', { limit, days });
    const cached = getCachedSearchData(cacheKey);
    
    if (cached) {
        return cached;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await client.search({
        index: 'feeds',
        body: {
            query: {
                bool: {
                    must: [
                        {
                            range: {
                                pubDate: {
                                    gte: startDate.toISOString(),
                                },
                            },
                        },
                        {
                            range: {
                                aiScore: {
                                    gte: 0.7,
                                },
                            },
                        },
                    ],
                },
            },
            sort: [
                { aiScore: 'desc' },
                { pubDate: 'desc' },
            ],
            size: limit,
        },
    });

    const trending = result.hits.hits.map((hit: any) => hit._source);
    
    // Cache the result
    setCachedSearchData(cacheKey, trending);
    
    return trending;
};

// Get search suggestions with caching
export const getSearchSuggestions = async (query: string, limit: number = 5): Promise<Array<{
    type: 'feed' | 'topic';
    title: string;
    count: number;
}>> => {
    const client = getElasticsearchClient();

    // Check cache
    const cacheKey = generateSearchCacheKey('suggestions', { query, limit });
    const cached = getCachedSearchData(cacheKey);
    
    if (cached) {
        return cached;
    }

    // Get feed suggestions
    const feedResult = await client.search({
        index: 'feeds',
        body: {
            query: {
                multi_match: {
                    query,
                    fields: ['title^3', 'content'],
                    type: 'phrase_prefix',
                },
            },
            size: limit,
            _source: ['title'],
            aggs: {
                sources: {
                    terms: {
                        field: 'source',
                        size: 5,
                    },
                },
            },
        },
    });

    const suggestions: Array<{
        type: 'feed' | 'topic';
        title: string;
        count: number;
    }> = [];

    // Add feed suggestions
    feedResult.hits.hits.forEach((hit: any) => {
        suggestions.push({
            type: 'feed',
            title: hit._source.title,
            count: 0,
        });
    });

    // Add source/topic suggestions from aggregations
    const sourcesAgg = feedResult.aggregations?.sources as any;
    if (sourcesAgg?.buckets) {
        sourcesAgg.buckets.forEach((bucket: any) => {
            suggestions.push({
                type: 'topic',
                title: bucket.key,
                count: bucket.doc_count,
            });
        });
    }

    const result = suggestions.slice(0, limit);
    
    // Cache the result
    setCachedSearchData(cacheKey, result);
    
    return result;
};

// Delete all feeds (for testing/cleanup)
export const deleteAllFeeds = async (): Promise<void> => {
    const client = getElasticsearchClient();

    await client.deleteByQuery({
        index: 'feeds',
        body: {
            query: {
                match_all: {},
            },
        },
    });
    
    // Invalidate cache
    await invalidateCachePattern('search*');
    searchCache.clear();
};

// Invalidate search cache
export const invalidateSearchCache = async (): Promise<void> => {
    searchCache.clear();
    await invalidateCachePattern('search*');
    console.log('Search cache invalidated');
};
