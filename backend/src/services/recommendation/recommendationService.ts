import http from 'http';

// Configuration
const AI_SERVICE_HOST = process.env.AI_SERVICE_HOST || 'localhost';
const AI_SERVICE_PORT = process.env.AI_SERVICE_PORT || '8000';
const AI_SERVICE_URL = `http://${AI_SERVICE_HOST}:${AI_SERVICE_PORT}`;

/**
 * Recommendation result interface
 */
export interface RecommendationResult {
    feedId: string;
    score: number;
    reason: string;
    method: 'content-based' | 'collaborative' | 'hybrid';
}

/**
 * Content-based recommendation result
 */
export interface ContentBasedRecommendation {
    feedId: string;
    similarity: number;
    commonEntities: string[];
}

/**
 * Collaborative filtering recommendation result
 */
export interface CollaborativeRecommendation {
    feedId: string;
    similarUsers: number;
    avgRating: number;
}

/**
 * User interaction interface
 */
export interface UserInteraction {
    userId: string;
    feedId: string;
    action: 'view' | 'save' | 'share';
    timestamp: string;
    duration?: number; // Time spent viewing (in seconds)
}

/**
 * Generate embedding for text using AI service
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({ text });

        const options = {
            hostname: AI_SERVICE_HOST,
            port: parseInt(AI_SERVICE_PORT),
            path: '/embed',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (res.statusCode === 200) {
                        resolve(response.embedding);
                    } else {
                        reject(new Error(`Embedding API error: ${res.statusCode}`));
                    }
                } catch (error) {
                    reject(new Error(`Failed to parse embedding response: ${error}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`Embedding request failed: ${error.message}`));
        });

        req.write(postData);
        req.end();
    });
};

/**
 * Calculate cosine similarity between two vectors
 */
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
    if (vecA.length !== vecB.length) {
        throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Get content-based recommendations for a feed
 */
export const getContentBasedRecommendations = async (
    feedId: string,
    feedTitle: string,
    feedContent: string,
    allFeeds: Array<{ id: string; title: string; content: string }>,
    limit: number = 10
): Promise<ContentBasedRecommendation[]> => {
    try {
        // Generate embedding for the target feed
        const targetEmbedding = await generateEmbedding(`${feedTitle} ${feedContent || ''}`);

        // Calculate similarity with all other feeds
        const similarities = await Promise.all(
            allFeeds.map(async (feed) => {
                if (feed.id === feedId) {
                    return null;
                }

                const feedEmbedding = await generateEmbedding(`${feed.title} ${feed.content || ''}`);
                const similarity = cosineSimilarity(targetEmbedding, feedEmbedding);

                return {
                    feedId: feed.id,
                    similarity
                };
            })
        );

        // Filter out nulls and sort by similarity
        const validSimilarities = similarities.filter((s): s is ContentBasedRecommendation => s !== null);
        validSimilarities.sort((a, b) => b.similarity - a.similarity);

        // Get top recommendations
        const recommendations = validSimilarities.slice(0, limit);

        // Extract common entities for each recommendation
        const enrichedRecommendations = await Promise.all(
            recommendations.map(async (rec) => {
                const feed = allFeeds.find(f => f.id === rec.feedId);
                if (!feed) {
                    return rec;
                }

                // Find common entities (this would require graph integration)
                const commonEntities: string[] = [];

                return {
                    feedId: rec.feedId,
                    similarity: rec.similarity,
                    commonEntities
                };
            })
        );

        return enrichedRecommendations;
    } catch (error) {
        console.error('Error getting content-based recommendations:', error);
        return [];
    }
};

/**
 * Get collaborative filtering recommendations
 */
export const getCollaborativeRecommendations = async (
    userId: string,
    allInteractions: UserInteraction[],
    limit: number = 10
): Promise<CollaborativeRecommendation[]> => {
    try {
        // Group interactions by user
        const interactionsByUser = new Map<string, UserInteraction[]>();
        for (const interaction of allInteractions) {
            const existing = interactionsByUser.get(interaction.userId) || [];
            existing.push(interaction);
            interactionsByUser.set(interaction.userId, existing);
        }

        // Calculate user similarity based on interaction patterns
        const userSimilarities = new Map<string, number[]>();

        for (const [currentUserId, userInteractions] of interactionsByUser) {
            if (currentUserId === userId) {
                continue; // Skip current user
            }

            // Calculate similarity based on common feeds interacted with
            const currentUserInteractions = interactionsByUser.get(userId) || [];
            const currentFeedIds = new Set(currentUserInteractions.map(i => i.feedId));
            const otherFeedIds = new Set(userInteractions.map(i => i.feedId));

            const intersection = new Set([...currentFeedIds].filter(x => otherFeedIds.has(x)));
            const union = new Set([...currentFeedIds, ...otherFeedIds]);

            const jaccardSimilarity = intersection.size / union.size;

            userSimilarities.set(currentUserId, [jaccardSimilarity]);
        }

        // Sort users by similarity
        const similarUsers = Array.from(userSimilarities.entries())
            .sort(([, a], [, b]) => b[0] - a[0])
            .slice(0, 20); // Top 20 similar users

        // Get feeds liked by similar users
        const feedScores = new Map<string, { score: number; count: number }>();

        for (const [similarUserId, similarities] of similarUsers) {
            const similarUserInteractions = interactionsByUser.get(similarUserId) || [];

            for (const interaction of similarUserInteractions) {
                if (interaction.action === 'save' || interaction.action === 'share') {
                    const existing = feedScores.get(interaction.feedId) || { score: 0, count: 0 };
                    existing.score += similarities[0]; // Weight by user similarity
                    existing.count += 1;
                    feedScores.set(interaction.feedId, existing);
                }
            }
        }

        // Sort feeds by score
        const sortedFeeds = Array.from(feedScores.entries())
            .sort(([, a], [, b]) => b.score - a.score)
            .slice(0, limit);

        return sortedFeeds.map(([feedId, data]) => ({
            feedId,
            similarUsers: data.count,
            avgRating: data.score / data.count
        }));
    } catch (error) {
        console.error('Error getting collaborative recommendations:', error);
        return [];
    }
};

/**
 * Get hybrid recommendations combining content-based and collaborative
 */
export const getHybridRecommendations = async (
    userId: string,
    feedId: string,
    feedTitle: string,
    feedContent: string,
    allFeeds: Array<{ id: string; title: string; content: string }>,
    allInteractions: UserInteraction[],
    contentWeight: number = 0.5,
    collaborativeWeight: number = 0.5,
    limit: number = 10
): Promise<RecommendationResult[]> => {
    try {
        // Get content-based recommendations
        const contentRecs = await getContentBasedRecommendations(
            feedId,
            feedTitle,
            feedContent,
            allFeeds,
            limit
        );

        // Get collaborative filtering recommendations
        const collabRecs = await getCollaborativeRecommendations(
            userId,
            allInteractions,
            limit
        );

        // Combine scores
        const combinedScores = new Map<string, {
            contentScore: number;
            collabScore: number;
            finalScore: number;
            reason: string;
        }>();

        // Add content-based scores
        for (const rec of contentRecs) {
            const existing = combinedScores.get(rec.feedId) || {
                contentScore: 0,
                collabScore: 0,
                finalScore: 0,
                reason: ''
            };
            existing.contentScore = rec.similarity;
            existing.reason = `Similar content (${(rec.similarity * 100).toFixed(0)}% match)`;
            combinedScores.set(rec.feedId, existing);
        }

        // Add collaborative scores
        for (const rec of collabRecs) {
            const existing = combinedScores.get(rec.feedId) || {
                contentScore: 0,
                collabScore: 0,
                finalScore: 0,
                reason: ''
            };
            existing.collabScore = rec.avgRating;
            if (existing.reason) {
                existing.reason += `, liked by ${rec.similarUsers} similar users`;
            } else {
                existing.reason = `Liked by ${rec.similarUsers} similar users`;
            }
            combinedScores.set(rec.feedId, existing);
        }

        // Calculate final scores
        const recommendations: RecommendationResult[] = [];

        for (const [feedId, scores] of combinedScores) {
            const finalScore = (scores.contentScore * contentWeight) + (scores.collabScore * collaborativeWeight);
            recommendations.push({
                feedId,
                score: finalScore,
                reason: scores.reason,
                method: 'hybrid'
            });
        }

        // Sort by final score
        recommendations.sort((a, b) => b.score - a.score);

        return recommendations.slice(0, limit);
    } catch (error) {
        console.error('Error getting hybrid recommendations:', error);
        return [];
    }
};

/**
 * Get personalized recommendations for a user
 */
export const getPersonalizedRecommendations = async (
    userId: string,
    allFeeds: Array<{ id: string; title: string; content: string }>,
    userInteractions: UserInteraction[],
    limit: number = 10
): Promise<RecommendationResult[]> => {
    try {
        // Get user's recent interactions to determine interests
        const userRecentInteractions = userInteractions
            .filter(i => i.userId === userId)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 50); // Last 50 interactions

        // If user has interactions, use hybrid approach
        if (userRecentInteractions.length > 0) {
            // Get recommendations based on user's last viewed/saved feed
            const lastFeed = userRecentInteractions[0];
            const feed = allFeeds.find(f => f.id === lastFeed.feedId);

            if (feed) {
                return await getHybridRecommendations(
                    userId,
                    feed.id,
                    feed.title,
                    feed.content || '',
                    allFeeds,
                    userInteractions,
                    0.6, // Weight collaborative higher for returning users
                    0.4,
                    limit
                );
            }
        }

        // Fallback to trending/popular feeds
        return allFeeds
            .slice(0, limit)
            .map(feed => ({
                feedId: feed.id,
                score: 0.5, // Default score
                reason: 'Popular content',
                method: 'content-based'
            }));
    } catch (error) {
        console.error('Error getting personalized recommendations:', error);
        return [];
    }
};

/**
 * Get trending feeds based on recent interactions
 */
export const getTrendingFeeds = async (
    allInteractions: UserInteraction[],
    limit: number = 10
): Promise<RecommendationResult[]> => {
    try {
        const feedCounts = new Map<string, number>();

        // Count interactions per feed
        for (const interaction of allInteractions) {
            const count = feedCounts.get(interaction.feedId) || 0;
            // Weight saves higher than views
            const weight = interaction.action === 'save' ? 2 : 1;
            feedCounts.set(interaction.feedId, count + weight);
        }

        // Sort by count
        const sortedFeeds = Array.from(feedCounts.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit);

        return sortedFeeds.map(([feedId, count]) => ({
            feedId,
            score: Math.min(count / 10, 1), // Normalize to 0-1
            reason: `Trending (${count} interactions)`,
            method: 'content-based'
        }));
    } catch (error) {
        console.error('Error getting trending feeds:', error);
        return [];
    }
};
