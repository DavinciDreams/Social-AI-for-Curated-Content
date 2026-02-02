import { Request, Response } from 'express';
import {
    handleTwitterOAuth,
    handleRedditOAuth,
    handleGoogleOAuth,
    OAuthProfile,
    AuthResult,
} from './authService';

/**
 * Twitter OAuth callback handler
 * This is a simplified version - in production, you would use passport-twitter
 * and handle the full OAuth flow with proper state management.
 */
export const twitterCallback = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        // In production, this would come from passport-twitter
        const profile: OAuthProfile = {
            id: req.body.oauthId || req.query.oauthId as string,
            email: req.body.email as string,
            name: req.body.name as string,
            username: req.body.username as string,
        };
        
        if (!profile.id) {
            res.status(400).json({ error: 'Missing OAuth ID' });
            return;
        }
        
        const result: AuthResult = await handleTwitterOAuth(profile);
        
        // In production, redirect to frontend with token
        res.json({
            success: true,
            user: result.user,
            token: result.token,
        });
    } catch (error) {
        console.error('Twitter OAuth error:', error);
        res.status(500).json({ error: 'Twitter authentication failed' });
    }
};

/**
 * Reddit OAuth callback handler
 * This is a simplified version - in production, you would use passport-reddit
 * and handle the full OAuth flow with proper state management.
 */
export const redditCallback = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        // In production, this would come from passport-reddit
        const profile: OAuthProfile = {
            id: req.body.oauthId || req.query.oauthId as string,
            email: req.body.email as string,
            name: req.body.name as string,
            username: req.body.username as string,
        };
        
        if (!profile.id) {
            res.status(400).json({ error: 'Missing OAuth ID' });
            return;
        }
        
        const result: AuthResult = await handleRedditOAuth(profile);
        
        // In production, redirect to frontend with token
        res.json({
            success: true,
            user: result.user,
            token: result.token,
        });
    } catch (error) {
        console.error('Reddit OAuth error:', error);
        res.status(500).json({ error: 'Reddit authentication failed' });
    }
};

/**
 * Google OAuth callback handler
 */
export const googleCallback = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        // In production, this would come from passport-google-oauth20
        const profile: OAuthProfile = {
            id: req.body.oauthId || req.query.oauthId as string,
            email: req.body.email as string,
            name: req.body.name as string,
            username: req.body.username as string,
        };
        
        if (!profile.id) {
            res.status(400).json({ error: 'Missing OAuth ID' });
            return;
        }
        
        const result: AuthResult = await handleGoogleOAuth(profile);
        
        // In production, redirect to frontend with token
        res.json({
            success: true,
            user: result.user,
            token: result.token,
        });
    } catch (error) {
        console.error('Google OAuth error:', error);
        res.status(500).json({ error: 'Google authentication failed' });
    }
};

/**
 * Get current user info
 */
export const getCurrentUser = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        // User is attached by authenticate middleware
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        
        res.json({
            success: true,
            user: req.user,
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
};

/**
 * Logout handler
 * In a stateless JWT setup, logout is handled client-side by removing the token
 */
export const logout = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        res.json({
            success: true,
            message: 'Logged out successfully',
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
};
