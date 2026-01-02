import { Request, Response } from 'express';
import { fetchFeeds } from './feedService';

export const getFeeds = async (req: Request, res: Response) => {
    try {
        const feeds = await fetchFeeds();
        res.json({
            source: 'Aggregated',
            items: feeds
        });
    } catch (error) {
        console.error('Error fetching feeds:', error);
        res.status(500).json({ error: 'Failed to fetch feeds' });
    }
};
