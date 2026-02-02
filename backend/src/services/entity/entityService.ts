import http from 'http';

// Configuration
const AI_SERVICE_HOST = process.env.AI_SERVICE_HOST || 'localhost';
const AI_SERVICE_PORT = process.env.AI_SERVICE_PORT || '8000';
const AI_SERVICE_URL = `http://${AI_SERVICE_HOST}:${AI_SERVICE_PORT}`;

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
 * Extracted entity interface
 */
export interface ExtractedEntity {
    name: string;
    type: EntityType;
    confidence: number;
    normalized_name: string;
    start?: number;
    end?: number;
}

/**
 * Entity extraction request
 */
export interface EntityExtractionRequest {
    text: string;
    max_entities?: number;
    min_confidence?: number;
}

/**
 * Entity extraction response
 */
export interface EntityExtractionResponse {
    entities: ExtractedEntity[];
    total_entities: number;
    processing_time_ms: number;
}

/**
 * Call AI service for entity extraction
 */
const callAIService = async (
    endpoint: string,
    data: any
): Promise<any> => {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);

        const options = {
            hostname: AI_SERVICE_HOST,
            port: AI_SERVICE_PORT,
            path: endpoint,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    if (res.statusCode === 200) {
                        resolve(parsed);
                    } else {
                        reject(new Error(`AI Service error: ${res.statusCode} - ${responseData}`));
                    }
                } catch (error) {
                    reject(new Error(`Failed to parse AI Service response: ${responseData}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`AI Service request failed: ${error.message}`));
        });

        req.write(postData);
        req.end();
    });
};

/**
 * Extract entities from text using the AI service
 */
export const extractEntities = async (
    text: string,
    options: {
        max_entities?: number;
        min_confidence?: number;
    } = {}
): Promise<ExtractedEntity[]> => {
    try {
        if (!text || text.trim().length === 0) {
            return [];
        }

        const request: EntityExtractionRequest = {
            text,
            max_entities: options.max_entities || 50,
            min_confidence: options.min_confidence || 0.5
        };

        const response = await callAIService('/extract', request) as EntityExtractionResponse;

        // Normalize entities
        const normalizedEntities = response.entities.map(entity => ({
            ...entity,
            normalized_name: entity.name.toLowerCase().trim()
        }));

        return normalizedEntities;
    } catch (error) {
        console.error('Error extracting entities:', error);
        // Return empty array on error to not break the feed processing
        return [];
    }
};

/**
 * Normalize entity name for matching
 */
export const normalizeEntityName = (name: string): string => {
    return name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s-]/g, '');
};

/**
 * Check if two entity names refer to the same entity
 */
export const areEntitiesSame = (name1: string, name2: string): boolean => {
    const normalized1 = normalizeEntityName(name1);
    const normalized2 = normalizeEntityName(name2);

    if (normalized1 === normalized2) {
        return true;
    }

    // Check for common abbreviations or variations
    const variations1 = getEntityVariations(normalized1);
    const variations2 = getEntityVariations(normalized2);

    return variations1.some(v => variations2.includes(v));
};

/**
 * Get common variations of an entity name
 */
const getEntityVariations = (name: string): string[] => {
    const variations = [name];

    // Remove common suffixes
    const suffixes = ['inc', 'llc', 'corp', 'corporation', 'ltd', 'limited', 'co', 'company'];
    for (const suffix of suffixes) {
        if (name.endsWith(` ${suffix}`) || name.endsWith(`.${suffix}`)) {
            variations.push(name.replace(new RegExp(`[\\s.]${suffix}$`), '').trim());
        }
    }

    // Handle common abbreviations
    const abbreviations: Record<string, string[]> = {
        'openai': ['open ai', 'open-ai', 'openai inc'],
        'google': ['alphabet', 'alphabet inc', 'google llc'],
        'microsoft': ['msft', 'microsoft corporation'],
        'amazon': ['amzn', 'amazon.com'],
        'meta': ['facebook', 'meta platforms'],
        'apple': ['aapl', 'apple inc'],
        'nvidia': ['nvda', 'nvidia corporation'],
        'tesla': ['tsla', 'tesla inc'],
        'twitter': ['x', 'twitter inc', 'x corp'],
    };

    for (const [key, values] of Object.entries(abbreviations)) {
        if (name === key || values.includes(name)) {
            variations.push(key);
            variations.push(...values);
        }
    }

    return [...new Set(variations)];
};

/**
 * Deduplicate entities based on normalized names
 */
export const deduplicateEntities = (entities: ExtractedEntity[]): ExtractedEntity[] => {
    const seen = new Map<string, ExtractedEntity>();

    for (const entity of entities) {
        const normalized = entity.normalized_name;

        if (!seen.has(normalized)) {
            seen.set(normalized, entity);
        } else {
            // Keep the entity with higher confidence
            const existing = seen.get(normalized)!;
            if (entity.confidence > existing.confidence) {
                seen.set(normalized, entity);
            }
        }
    }

    return Array.from(seen.values());
};

/**
 * Filter entities by confidence threshold
 */
export const filterEntitiesByConfidence = (
    entities: ExtractedEntity[],
    minConfidence: number = 0.5
): ExtractedEntity[] => {
    return entities.filter(entity => entity.confidence >= minConfidence);
};

/**
 * Filter entities by type
 */
export const filterEntitiesByType = (
    entities: ExtractedEntity[],
    types: EntityType[]
): ExtractedEntity[] => {
    return entities.filter(entity => types.includes(entity.type));
};

/**
 * Get entity statistics
 */
export const getEntityStats = (entities: ExtractedEntity[]): {
    total: number;
    byType: Record<string, number>;
    avgConfidence: number;
} => {
    const byType: Record<string, number> = {};
    let totalConfidence = 0;

    for (const entity of entities) {
        byType[entity.type] = (byType[entity.type] || 0) + 1;
        totalConfidence += entity.confidence;
    }

    return {
        total: entities.length,
        byType,
        avgConfidence: entities.length > 0 ? totalConfidence / entities.length : 0
    };
};

/**
 * Extract entities from feed content
 */
export const extractEntitiesFromFeed = async (
    title: string,
    content?: string
): Promise<ExtractedEntity[]> => {
    const text = content ? `${title}\n\n${content}` : title;

    // Extract entities
    let entities = await extractEntities(text);

    // Deduplicate
    entities = deduplicateEntities(entities);

    // Filter by confidence
    entities = filterEntitiesByConfidence(entities, 0.5);

    return entities;
};

/**
 * Get top entities by frequency
 */
export const getTopEntities = (
    entities: ExtractedEntity[],
    limit: number = 10
): Array<{ entity: ExtractedEntity; count: number }> => {
    const frequency = new Map<string, { entity: ExtractedEntity; count: number }>();

    for (const entity of entities) {
        const key = entity.normalized_name;

        if (!frequency.has(key)) {
            frequency.set(key, { entity, count: 1 });
        } else {
            const existing = frequency.get(key)!;
            existing.count += 1;
            // Update with higher confidence if available
            if (entity.confidence > existing.entity.confidence) {
                existing.entity = entity;
            }
        }
    }

    const sorted = Array.from(frequency.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

    return sorted;
};
