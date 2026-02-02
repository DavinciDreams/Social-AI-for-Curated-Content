import neo4j, { Driver, Session, Integer } from 'neo4j-driver';

// Configuration from environment variables
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

// Neo4j Driver instance
let driver: Driver | null = null;

/**
 * Initialize Neo4j driver connection
 */
export const initNeo4j = (): Driver => {
    if (!driver) {
        driver = neo4j.driver(
            NEO4J_URI,
            neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
        );

        // Verify connection
        driver.verifyConnectivity()
            .then(() => console.log('Neo4j connection established successfully'))
            .catch((error) => {
                console.error('Failed to connect to Neo4j:', error);
                throw error;
            });
    }

    return driver;
};

/**
 * Get Neo4j driver instance
 */
export const getDriver = (): Driver => {
    if (!driver) {
        return initNeo4j();
    }
    return driver;
};

/**
 * Close Neo4j driver connection
 */
export const closeNeo4j = async (): Promise<void> => {
    if (driver) {
        await driver.close();
        driver = null;
        console.log('Neo4j connection closed');
    }
};

/**
 * Get a new session from the driver
 */
export const getSession = (): Session => {
    const driverInstance = getDriver();
    return driverInstance.session();
};

// ============================================================================
// Node Interfaces
// ============================================================================

/**
 * Base interface for all graph nodes
 */
export interface GraphNode {
    id: string;
    labels: string[];
    properties: Record<string, any>;
}

/**
 * Entity node interface (person, organization, location, topic, etc.)
 */
export interface EntityNode extends GraphNode {
    labels: ['Entity'];
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
 * Feed node interface (represents a feed item)
 */
export interface FeedNode extends GraphNode {
    labels: ['Feed'];
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
 * User node interface
 */
export interface UserNode extends GraphNode {
    labels: ['User'];
    properties: {
        id: string;
        email: string;
        name?: string;
        created_at?: string;
        updated_at?: string;
    };
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

// ============================================================================
// Relationship Interfaces
// ============================================================================

/**
 * Base interface for all graph relationships
 */
export interface GraphRelationship {
    id: string;
    type: string;
    source: string;
    target: string;
    properties: Record<string, any>;
}

/**
 * MENTIONED_IN relationship (Entity -> Feed)
 */
export interface MentionedInRelationship extends GraphRelationship {
    type: 'MENTIONED_IN';
    properties: {
        confidence?: number;
        frequency?: number;
        created_at?: string;
    };
}

/**
 * SAVED_BY relationship (Feed -> User)
 */
export interface SavedByRelationship extends GraphRelationship {
    type: 'SAVED_BY';
    properties: {
        saved_at?: string;
        created_at?: string;
    };
}

/**
 * RELATED_TO relationship (Entity -> Entity or Feed -> Feed)
 */
export interface RelatedToRelationship extends GraphRelationship {
    type: 'RELATED_TO';
    properties: {
        strength?: number;
        relationship_type?: string;
        created_at?: string;
    };
}

/**
 * INTERESTED_IN relationship (User -> Entity)
 */
export interface InterestedInRelationship extends GraphRelationship {
    type: 'INTERESTED_IN';
    properties: {
        strength?: number;
        created_at?: string;
    };
}

// ============================================================================
// Graph Data Structure for Frontend
// ============================================================================

/**
 * Node structure for frontend graph visualization
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
 * Link structure for frontend graph visualization
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

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create or update an entity node
 */
export const createEntityNode = async (
    name: string,
    type: EntityType,
    properties: Partial<EntityNode['properties']> = {}
): Promise<EntityNode> => {
    const session = getSession();
    const timestamp = new Date().toISOString();

    try {
        const result = await session.run(
            `
            MERGE (e:Entity {normalized_name: $normalized_name})
            ON CREATE SET
                e.name = $name,
                e.type = $type,
                e.normalized_name = $normalized_name,
                e.created_at = $timestamp,
                e.updated_at = $timestamp
            ON MATCH SET
                e.updated_at = $timestamp
            SET e += $properties
            RETURN e
            `,
            {
                name,
                type,
                normalized_name: name.toLowerCase().trim(),
                timestamp,
                properties
            }
        );

        const record = result.records[0];
        const node = record.get('e');

        return {
            id: node.elementId,
            labels: node.labels,
            properties: node.properties
        } as EntityNode;
    } finally {
        await session.close();
    }
};

/**
 * Create or update a feed node
 */
export const createFeedNode = async (
    feedData: Omit<FeedNode['properties'], 'created_at' | 'updated_at'>
): Promise<FeedNode> => {
    const session = getSession();
    const timestamp = new Date().toISOString();

    try {
        const result = await session.run(
            `
            MERGE (f:Feed {id: $id})
            ON CREATE SET f.created_at = $timestamp
            SET f += $data, f.updated_at = $timestamp
            RETURN f
            `,
            {
                id: feedData.id,
                data: feedData,
                timestamp
            }
        );

        const record = result.records[0];
        const node = record.get('f');

        return {
            id: node.elementId,
            labels: node.labels,
            properties: node.properties
        } as FeedNode;
    } finally {
        await session.close();
    }
};

/**
 * Create or update a user node
 */
export const createUserNode = async (
    userData: Omit<UserNode['properties'], 'created_at' | 'updated_at'>
): Promise<UserNode> => {
    const session = getSession();
    const timestamp = new Date().toISOString();

    try {
        const result = await session.run(
            `
            MERGE (u:User {id: $id})
            ON CREATE SET u.created_at = $timestamp
            SET u += $data, u.updated_at = $timestamp
            RETURN u
            `,
            {
                id: userData.id,
                data: userData,
                timestamp
            }
        );

        const record = result.records[0];
        const node = record.get('u');

        return {
            id: node.elementId,
            labels: node.labels,
            properties: node.properties
        } as UserNode;
    } finally {
        await session.close();
    }
};

/**
 * Create MENTIONED_IN relationship between entity and feed
 */
export const createMentionedInRelationship = async (
    entityId: string,
    feedId: string,
    properties: Partial<MentionedInRelationship['properties']> = {}
): Promise<void> => {
    const session = getSession();
    const timestamp = new Date().toISOString();

    try {
        await session.run(
            `
            MATCH (e:Entity)
            WHERE e.id = $entityId OR e.elementId = $entityId
            MATCH (f:Feed)
            WHERE f.id = $feedId OR f.elementId = $feedId
            MERGE (e)-[r:MENTIONED_IN]->(f)
            ON CREATE SET r.created_at = $timestamp
            SET r += $properties, r.updated_at = $timestamp
            `,
            {
                entityId,
                feedId,
                timestamp,
                properties
            }
        );
    } finally {
        await session.close();
    }
};

/**
 * Create SAVED_BY relationship between feed and user
 */
export const createSavedByRelationship = async (
    feedId: string,
    userId: string,
    properties: Partial<SavedByRelationship['properties']> = {}
): Promise<void> => {
    const session = getSession();
    const timestamp = new Date().toISOString();

    try {
        await session.run(
            `
            MATCH (f:Feed)
            WHERE f.id = $feedId OR f.elementId = $feedId
            MATCH (u:User)
            WHERE u.id = $userId OR u.elementId = $userId
            MERGE (f)-[r:SAVED_BY]->(u)
            ON CREATE SET r.created_at = $timestamp
            SET r += $properties, r.updated_at = $timestamp
            `,
            {
                feedId,
                userId,
                timestamp,
                properties
            }
        );
    } finally {
        await session.close();
    }
};

/**
 * Create RELATED_TO relationship between two entities
 */
export const createRelatedToRelationship = async (
    sourceId: string,
    targetId: string,
    properties: Partial<RelatedToRelationship['properties']> = {}
): Promise<void> => {
    const session = getSession();
    const timestamp = new Date().toISOString();

    try {
        await session.run(
            `
            MATCH (a)
            WHERE a.id = $sourceId OR a.elementId = $sourceId
            MATCH (b)
            WHERE b.id = $targetId OR b.elementId = $targetId
            MERGE (a)-[r:RELATED_TO]->(b)
            ON CREATE SET r.created_at = $timestamp
            SET r += $properties, r.updated_at = $timestamp
            `,
            {
                sourceId,
                targetId,
                timestamp,
                properties
            }
        );
    } finally {
        await session.close();
    }
};

/**
 * Create INTERESTED_IN relationship between user and entity
 */
export const createInterestedInRelationship = async (
    userId: string,
    entityId: string,
    properties: Partial<InterestedInRelationship['properties']> = {}
): Promise<void> => {
    const session = getSession();
    const timestamp = new Date().toISOString();

    try {
        await session.run(
            `
            MATCH (u:User)
            WHERE u.id = $userId OR u.elementId = $userId
            MATCH (e:Entity)
            WHERE e.id = $entityId OR e.elementId = $entityId
            MERGE (u)-[r:INTERESTED_IN]->(e)
            ON CREATE SET r.created_at = $timestamp
            SET r += $properties, r.updated_at = $timestamp
            `,
            {
                userId,
                entityId,
                timestamp,
                properties
            }
        );
    } finally {
        await session.close();
    }
};

// ============================================================================
// Graph Query Functions
// ============================================================================

/**
 * Get graph data for visualization
 */
export const getGraphData = async (
    filters: GraphQueryFilters = {}
): Promise<GraphViewData> => {
    const session = getSession();

    try {
        let query = `
            MATCH (n)
            `;

        // Add filters
        const conditions: string[] = [];
        const params: Record<string, any> = {};

        if (filters.entityTypes && filters.entityTypes.length > 0) {
            conditions.push('n.type IN $entityTypes');
            params.entityTypes = filters.entityTypes;
        }

        if (filters.sources && filters.sources.length > 0) {
            conditions.push('n.source IN $sources');
            params.sources = filters.sources;
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += `
            OPTIONAL MATCH (n)-[r]-(other)
            WITH n, collect(DISTINCT {source: n.id, target: other.id, type: type(r)}) as links
            RETURN n, links
        `;

        if (filters.limit) {
            query += ` LIMIT ${filters.limit}`;
        }

        const result = await session.run(query, params);

        const nodes: GraphViewNode[] = [];
        const linksMap = new Map<string, GraphViewLink>();

        for (const record of result.records) {
            const node = record.get('n');
            const links = record.get('links');

            // Map node properties to frontend format
            const graphNode: GraphViewNode = {
                id: node.properties.id || node.elementId,
                name: node.properties.name || node.properties.title || node.elementId,
                type: node.properties.type || node.labels[0],
                val: getNodeValue(node.labels[0], node.properties),
                color: getNodeColor(node.labels[0], node.properties),
                properties: node.properties
            };
            nodes.push(graphNode);

            // Add links
            for (const link of links) {
                const key = `${link.source}-${link.target}`;
                if (!linksMap.has(key)) {
                    linksMap.set(key, {
                        source: link.source,
                        target: link.target,
                        type: link.type
                    });
                }
            }
        }

        return {
            nodes,
            links: Array.from(linksMap.values())
        };
    } finally {
        await session.close();
    }
};

/**
 * Get feeds related to an entity
 */
export const getFeedsByEntity = async (entityName: string): Promise<FeedNode[]> => {
    const session = getSession();

    try {
        const result = await session.run(
            `
            MATCH (e:Entity {normalized_name: $normalized_name})-[:MENTIONED_IN]->(f:Feed)
            RETURN f
            ORDER BY f.pubDate DESC
            LIMIT 50
            `,
            { normalized_name: entityName.toLowerCase().trim() }
        );

        const feeds: FeedNode[] = [];
        for (const record of result.records) {
            const node = record.get('f');
            feeds.push({
                id: node.elementId,
                labels: node.labels,
                properties: node.properties
            } as FeedNode);
        }

        return feeds;
    } finally {
        await session.close();
    }
};

/**
 * Get entities related to a feed
 */
export const getEntitiesByFeed = async (feedId: string): Promise<EntityNode[]> => {
    const session = getSession();

    try {
        const result = await session.run(
            `
            MATCH (e:Entity)-[:MENTIONED_IN]->(f:Feed {id: $feedId})
            RETURN e
            ORDER BY e.confidence DESC
            `,
            { feedId }
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

        return entities;
    } finally {
        await session.close();
    }
};

/**
 * Get user's saved feeds
 */
export const getUserSavedFeeds = async (userId: string): Promise<FeedNode[]> => {
    const session = getSession();

    try {
        const result = await session.run(
            `
            MATCH (f:Feed)-[:SAVED_BY]->(u:User {id: $userId})
            RETURN f
            ORDER BY f.pubDate DESC
            `,
            { userId }
        );

        const feeds: FeedNode[] = [];
        for (const record of result.records) {
            const node = record.get('f');
            feeds.push({
                id: node.elementId,
                labels: node.labels,
                properties: node.properties
            } as FeedNode);
        }

        return feeds;
    } finally {
        await session.close();
    }
};

/**
 * Get related entities (entities that appear together in feeds)
 */
export const getRelatedEntities = async (entityName: string, limit = 10): Promise<EntityNode[]> => {
    const session = getSession();

    try {
        const result = await session.run(
            `
            MATCH (e1:Entity {normalized_name: $normalized_name})-[:MENTIONED_IN]->(f:Feed)<-[:MENTIONED_IN]-(e2:Entity)
            WHERE e1 <> e2
            RETURN e2, count(f) as frequency
            ORDER BY frequency DESC
            LIMIT $limit
            `,
            {
                normalized_name: entityName.toLowerCase().trim(),
                limit
            }
        );

        const entities: EntityNode[] = [];
        for (const record of result.records) {
            const node = record.get('e2');
            entities.push({
                id: node.elementId,
                labels: node.labels,
                properties: node.properties
            } as EntityNode);
        }

        return entities;
    } finally {
        await session.close();
    }
};

/**
 * Delete a node by ID
 */
export const deleteNode = async (nodeId: string): Promise<boolean> => {
    const session = getSession();

    try {
        const result = await session.run(
            `
            MATCH (n)
            WHERE n.id = $nodeId OR n.elementId = $nodeId
            DETACH DELETE n
            RETURN count(n) as deleted
            `,
            { nodeId }
        );

        const record = result.records[0];
        return record.get('deleted') > 0;
    } finally {
        await session.close();
    }
};

/**
 * Clear all data from the graph (use with caution)
 */
export const clearGraph = async (): Promise<void> => {
    const session = getSession();

    try {
        await session.run('MATCH (n) DETACH DELETE n');
        console.log('Graph cleared');
    } finally {
        await session.close();
    }
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get node value (size) based on node type and properties
 */
const getNodeValue = (label: string, properties: Record<string, any>): number => {
    switch (label) {
        case 'Feed':
            return 3;
        case 'User':
            return 5;
        case 'Entity':
            // Size based on entity type
            const type = properties.type;
            switch (type) {
                case EntityType.ORGANIZATION:
                    return 4;
                case EntityType.PERSON:
                    return 3;
                case EntityType.TECHNOLOGY:
                    return 3;
                case EntityType.TOPIC:
                    return 2;
                default:
                    return 2;
            }
        default:
            return 2;
    }
};

/**
 * Get node color based on node type
 */
const getNodeColor = (label: string, properties: Record<string, any>): string => {
    switch (label) {
        case 'Feed':
            return '#3b82f6'; // Blue
        case 'User':
            return '#10b981'; // Green
        case 'Entity':
            const type = properties.type;
            switch (type) {
                case EntityType.PERSON:
                    return '#f59e0b'; // Amber
                case EntityType.ORGANIZATION:
                    return '#8b5cf6'; // Purple
                case EntityType.LOCATION:
                    return '#ef4444'; // Red
                case EntityType.TECHNOLOGY:
                    return '#06b6d4'; // Cyan
                case EntityType.TOPIC:
                    return '#ec4899'; // Pink
                case EntityType.EVENT:
                    return '#f97316'; // Orange
                case EntityType.PRODUCT:
                    return '#14b8a6'; // Teal
                default:
                    return '#6b7280'; // Gray
            }
        default:
            return '#6b7280'; // Gray
    }
};

/**
 * Convert Integer to number (Neo4j driver returns Integers)
 */
export const toNumber = (value: Integer | number): number => {
    if (typeof value === 'number') {
        return value;
    }
    return value.toNumber();
};
