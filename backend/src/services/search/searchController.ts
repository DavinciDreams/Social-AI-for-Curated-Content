import { Request, Response, NextFunction } from 'express';
import {
    searchFeeds,
    autocompleteSearch,
    getSearchSuggestions,
    getTrendingFeeds,
    deleteAllFeeds,
} from './searchService';

// Search feeds
export const search = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const {
            q: query,
            sources,
            startDate,
            endDate,
            minScore,
            isSaved,
            sortField,
            sortOrder,
            page,
            limit,
        } = req.query;

        if (!query || typeof query !== 'string') {
            res.status(400).json({
                success: false,
                message: 'Query parameter "q" is required',
            });
            return;
        }

        // Build filters
        const filters: any = {};
        if (sources) {
            filters.sources = Array.isArray(sources) ? sources : [sources as string];
        }
        if (startDate || endDate) {
            filters.dateRange = {
                start: startDate as string,
                end: endDate as string,
            };
        }
        if (minScore) {
            filters.minScore = parseFloat(minScore as string);
        }
        if (isSaved !== undefined) {
            filters.isSaved = isSaved === 'true';
        }

        // Build sort
        const sort: any = {};
        if (sortField && sortOrder) {
            sort.field = sortField as string;
            sort.order = sortOrder as 'asc' | 'desc';
        }

        const result = await searchFeeds({
            query,
            filters,
            sort: Object.keys(sort).length > 0 ? sort : undefined,
            page: page ? parseInt(page as string) : 1,
            limit: limit ? parseInt(limit as string) : 20,
        });

        res.json({
            success: true,
            ...result,
        });
    } catch (error) {
        next(error);
    }
};

// Autocomplete search
export const autocomplete = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { q: query, limit } = req.query;

        if (!query || typeof query !== 'string') {
            res.status(400).json({
                success: false,
                message: 'Query parameter "q" is required',
            });
            return;
        }

        const suggestions = await autocompleteSearch(
            query,
            limit ? parseInt(limit as string) : 10
        );

        res.json({
            success: true,
            suggestions,
        });
    } catch (error) {
        next(error);
    }
};

// Get search suggestions
export const suggestions = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { q: query, limit } = req.query;

        if (!query || typeof query !== 'string') {
            res.status(400).json({
                success: false,
                message: 'Query parameter "q" is required',
            });
            return;
        }

        const suggestions = await getSearchSuggestions(
            query,
            limit ? parseInt(limit as string) : 5
        );

        res.json({
            success: true,
            suggestions,
        });
    } catch (error) {
        next(error);
    }
};

// Get trending feeds
export const trending = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { limit, days } = req.query;

        const feeds = await getTrendingFeeds(
            limit ? parseInt(limit as string) : 10,
            days ? parseInt(days as string) : 7
        );

        res.json({
            success: true,
            items: feeds,
            total: feeds.length,
        });
    } catch (error) {
        next(error);
    }
};

// Delete all feeds (admin only)
export const deleteAll = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        await deleteAllFeeds();

        res.json({
            success: true,
            message: 'All feeds deleted from search index',
        });
    } catch (error) {
        next(error);
    }
};
