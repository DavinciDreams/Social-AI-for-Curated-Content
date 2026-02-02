import { Router } from 'express';
import {
    getRecommendations,
    getTrending,
    getFeedRecommendations
} from './recommendationController';
import { authenticate } from '../../middleware/auth';

const router = Router();

// Public routes
router.get('/trending', getTrending);
router.get('/feeds/:feedId', getFeedRecommendations);

// Protected routes (require authentication)
router.use(authenticate);
router.get('/', getRecommendations);

export default router;
