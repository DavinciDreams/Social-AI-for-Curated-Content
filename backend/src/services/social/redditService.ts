import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import config from '../../config/config';
import { FeedItem } from '../feed/feedService';

const CACHE_FILE = path.join(__dirname, '../../config/reddit_cache.json');
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

interface RedditCache {
    data: FeedItem[];
    timestamp: number;
}

const getCache = async (): Promise<RedditCache | null> => {
    try {
        const data = await fs.readFile(CACHE_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return null;
    }
};

const setCache = async (items: FeedItem[]) => {
    try {
        const cacheData: RedditCache = { data: items, timestamp: Date.now() };
        await fs.writeFile(CACHE_FILE, JSON.stringify(cacheData, null, 2));
    } catch (err) {
        console.error('Failed to write Reddit cache:', err);
    }
};

export const fetchRedditFeed = async (): Promise<FeedItem[]> => {
    // Note: Reddit API is strict. We use the public JSON endpoints for high-signal subreddits
    // to avoid complex 3-legged OAuth for this local demo.
    // If the user provided credentials in config.social.reddit, we could use them for Client Credentials flow here.

    // 1. Try Cache First
    const cache = await getCache();
    if (cache && (Date.now() - cache.timestamp < CACHE_DURATION)) {
        console.log('Serving Reddit feed from persistent cache 💾');
        return cache.data;
    }

    try {
        console.log('Fetching new Reddit data... 🤖');

        // Aggregating high-signal technical subreddits
        const subreddits = 'MachineLearning+LocalLLaMA+technology+programming';
        const url = `https://www.reddit.com/r/${subreddits}/top.json?t=day&limit=15`;

        // User-Agent is required by Reddit API to avoid strict rate limiting
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'BrainRotFilter/1.0.0 (Local Self-Hosted)'
            }
        });

        if (!response.data?.data?.children) {
            return [];
        }

        const items: FeedItem[] = response.data.data.children.map((child: any) => {
            const data = child.data;
            return {
                title: `Reddit: ${data.title}`,
                link: `https://reddit.com${data.permalink}`,
                content: data.selftext || data.url, // Use selftext for text posts, url for links
                pubDate: new Date(data.created_utc * 1000).toISOString(),
                source: `Reddit (r/${data.subreddit})`
            };
        });

        // 2. Save to Cache
        await setCache(items);
        return items;

    } catch (error) {
        console.error('Reddit Fetch Error:', axios.isAxiosError(error) ? error.message : error);

        // 3. Fallback to Cache
        if (cache) {
            console.warn('Reddit Error: Serving stale cache.');
            return cache.data;
        }
        return [];
    }
};
