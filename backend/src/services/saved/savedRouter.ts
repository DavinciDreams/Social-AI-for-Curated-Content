import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import {
    saveItemController,
    unsaveItemController,
    getSavedItemsController,
    checkIsSavedController,
} from './savedController';

const router = Router();

/**
 * @route   POST /api/saved
 * @desc    Save an item
 * @access  Private
 */
router.post('/', authenticate, saveItemController);

/**
 * @route   DELETE /api/saved/:id
 * @desc    Unsave an item
 * @access  Private
 */
router.delete('/:id', authenticate, unsaveItemController);

/**
 * @route   GET /api/saved
 * @desc    Get saved items with pagination
 * @access  Private
 */
router.get('/', authenticate, getSavedItemsController);

/**
 * @route   GET /api/saved/check/:feedItemId
 * @desc    Check if an item is saved
 * @access  Private
 */
router.get('/check/:feedItemId', authenticate, checkIsSavedController);

export { router as savedRouter };
