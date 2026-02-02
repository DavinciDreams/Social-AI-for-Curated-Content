/**
 * Graph node interface for visualization
 */
export interface GraphViewNode {
    id: string;
    name: string;
    type: string;
    val?: number; // Size/value of node
    color?: string;
    properties?: Record<string, any>;
}

/**
 * Graph link interface for visualization
 */
export interface GraphViewLink {
    source: string;
    target: string;
    type?: string;
    strength?: number;
}

/**
 * Complete graph data structure for frontend
 */
export interface GraphViewData {
    nodes: GraphViewNode[];
    links: GraphViewLink[];
}

/**
 * Entity type enumeration
 */
export enum EntityType {
    PERSON = 'PERSON',
    ORGANIZATION = 'ORGANIZATION',
    LOCATION = 'LOCATION',
    TOPIC = 'TOPIC',
    TECHNOLOGY = 'TECHNOLOGY',
    EVENT = 'EVENT',
    PRODUCT = 'PRODUCT',
    OTHER = 'OTHER'
}

/**
 * Graph query filters
 */
export interface GraphQueryFilters {
    entityTypes?: EntityType[];
    sources?: string[];
    dateRange?: {
        start: string;
        end: string;
    };
    limit?: number;
}

/**
 * Entity node from API
 */
export interface EntityNode {
    id: string;
    labels: string[];
    properties: {
        name: string;
        type: EntityType;
        confidence?: number;
        normalized_name?: string;
        description?: string;
        created_at?: string;
        updated_at?: string;
    };
}

/**
 * Feed node from API
 */
export interface FeedNode {
    id: string;
    labels: string[];
    properties: {
        id: string;
        title: string;
        link: string;
        content?: string;
        source: string;
        pubDate?: string;
        aiScore?: number;
        reasoning?: string;
        created_at?: string;
        updated_at?: string;
    };
}

/**
 * Graph statistics
 */
export interface GraphStats {
    totalEntities: number;
    entitiesByType: Record<string, number>;
    totalFeeds: number;
    totalRelationships: number;
}

/**
 * Trending entity with count
 */
export interface TrendingEntity {
    entity: EntityNode;
    count: number;
}

/**
 * Related feed with similarity score
 */
export interface RelatedFeed {
    feed: FeedNode;
    score: number;
    reason: string;
}
