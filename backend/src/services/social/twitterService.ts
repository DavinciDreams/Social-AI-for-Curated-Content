import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import config from '../../config/config';
import { FeedItem } from '../feed/feedService';

const TWITTER_API_URL = 'https://api.twitter.com/2';
const CACHE_FILE = path.join(__dirname, '../../config/twitter_cache.json');
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

interface TwitterCache {
    data: FeedItem[];
    timestamp: number;
}

const getCache = async (): Promise<TwitterCache | null> => {
    try {
        const data = await fs.readFile(CACHE_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return null; // File doesn't exist or invalid
    }
};

const setCache = async (items: FeedItem[]) => {
    try {
        const cacheData: TwitterCache = { data: items, timestamp: Date.now() };
        await fs.writeFile(CACHE_FILE, JSON.stringify(cacheData, null, 2));
    } catch (err) {
        console.error('Failed to write Twitter cache:', err);
    }
};

export const fetchTwitterFeed = async (): Promise<FeedItem[]> => {
    const token = config.social?.twitter;

    if (!token) {
        // console.log('No Twitter token configured, skipping.');
        return [];
    }

    // 1. Try Cache First (Persistent)
    const cache = await getCache();
    if (cache && (Date.now() - cache.timestamp < CACHE_DURATION)) {
        console.log('Serving Twitter feed from persistent cache 💾');
        return cache.data;
    }

    try {
        console.log('Fetching new Twitter data... 🐦');

        // Using a high-signal search query
        const query = '(AI OR "Large Language Model" OR "Machine Learning") -is:retweet lang:en has:links';

        const response = await axios.get(`${TWITTER_API_URL}/tweets/search/recent`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            params: {
                'query': query,
                'max_results': 10,
                'tweet.fields': 'created_at,author_id,text'
            }
        });

        if (!response.data.data) {
            return [];
        }

        const items = response.data.data.map((tweet: any) => ({
            title: `Tweet: ${tweet.text.substring(0, 50)}...`,
            link: `https://twitter.com/i/web/status/${tweet.id}`,
            content: tweet.text,
            pubDate: tweet.created_at,
            source: 'Twitter (AI Search)'
        }));

        // 2. Save to Persistent Cache
        await setCache(items);
        return items;

    } catch (error) {
        // 3. Fallback: If Rate Limited, serve stale cache (even if expired)
        if (axios.isAxiosError(error) && error.response?.status === 429) {
            console.warn('Twitter Rate Limit Hit 🛑: Serving stale cache.');
            if (cache) return cache.data;
        }

        if (axios.isAxiosError(error)) {
            console.error('Twitter API Error:', error.response?.data || error.message);
        } else {
            console.error('Twitter Error:', error);
        }
        return cache ? cache.data : []; // Fallback to cache on any error if available
    }
};
