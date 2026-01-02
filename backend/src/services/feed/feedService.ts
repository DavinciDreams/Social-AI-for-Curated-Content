import Parser from 'rss-parser';
import { filterContent } from '../filter/filterService';
import config from '../../config/config';

const parser = new Parser();

export interface FeedItem {
    title?: string;
    link?: string;
    content?: string;
    pubDate?: string;
    source: string;
    aiScore?: number;
    reasoning?: string;
}

import { fetchTwitterFeed } from '../social/twitterService';
import { fetchRedditFeed } from '../social/redditService';

export const fetchFeeds = async (): Promise<FeedItem[]> => {
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

                return {
                    ...item,
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

        return validItems.sort((a, b) => {
            return new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime();
        });

    } catch (error) {
        console.error('Error fetching feeds:', error);
        throw error;
    }
};
