import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import {
    twitterCallback,
    redditCallback,
    googleCallback,
    getCurrentUser,
    logout,
} from './authController';

const router = Router();

/**
 * @route   POST /api/auth/twitter
 * @desc    Twitter OAuth callback
 * @access  Public
 */
router.post('/twitter', twitterCallback);

/**
 * @route   POST /api/auth/reddit
 * @desc    Reddit OAuth callback
 * @access  Public
 */
router.post('/reddit', redditCallback);

/**
 * @route   POST /api/auth/google
 * @desc    Google OAuth callback
 * @access  Public
 */
router.post('/google', googleCallback);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get('/me', authenticate, getCurrentUser);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, logout);

export { router as authRouter };
