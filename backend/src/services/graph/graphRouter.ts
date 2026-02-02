import { Router } from 'express';
import {
    getGraph,
    getFeedsByEntityName,
    getEntitiesByFeedId,
    getRelatedEntities,
    getUserSavedFeedsGraph,
    getRelatedFeeds,
    getTrendingEntitiesList,
    getGraphStats,
    searchEntitiesByName,
    saveFeed,
    unsaveFeed,
    deleteNode,
    clearGraph
} from './graphController';
import { authenticate } from '../../middleware/auth';

const router = Router();

// Public routes
router.get('/graph', getGraph);
router.get('/graph/stats', getGraphStats);
router.get('/graph/trending', getTrendingEntitiesList);
router.get('/graph/search', searchEntitiesByName);

// Entity-related routes
router.get('/graph/entities/:entityName/feeds', getFeedsByEntityName);
router.get('/graph/feeds/:feedId/entities', getEntitiesByFeedId);
router.get('/graph/entities/:entityName/related', getRelatedEntities);

// Feed-related routes
router.get('/graph/feeds/:feedId/related', getRelatedFeeds);

// Protected routes (require authentication)
router.use(authenticate);
router.get('/graph/user/saved', getUserSavedFeedsGraph);
router.post('/graph/feeds/save', saveFeed);
router.delete('/graph/feeds/:feedId/save', unsaveFeed);

// Admin routes (should be protected by admin middleware in production)
router.delete('/graph/nodes/:nodeId', deleteNode);
router.delete('/graph/clear', clearGraph);

export default router;
