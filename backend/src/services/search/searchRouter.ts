import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import {
    search,
    autocomplete,
    suggestions,
    trending,
    deleteAll,
} from './searchController';

const router = Router();

// Public routes
router.get('/', search);
router.get('/autocomplete', autocomplete);
router.get('/suggestions', suggestions);
router.get('/trending', trending);

// Admin routes (require authentication)
router.delete('/all', authenticate, deleteAll);

export default router;
