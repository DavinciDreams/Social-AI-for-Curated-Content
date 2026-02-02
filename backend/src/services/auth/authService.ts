import { User, findOrCreateUserByOAuth } from '../../models/user';
import { generateToken } from '../../middleware/auth';

/**
 * OAuth profile interface
 */
export interface OAuthProfile {
    id: string;
    email?: string;
    name?: string;
    username?: string;
}

/**
 * Authentication result
 */
export interface AuthResult {
    user: User;
    token: string;
}

/**
 * Handle Twitter OAuth callback
 */
export const handleTwitterOAuth = async (
    profile: OAuthProfile
): Promise<AuthResult> => {
    const email = profile.email || `${profile.username}@twitter.com`;
    const name = profile.name || profile.username || 'Twitter User';
    
    const user = await findOrCreateUserByOAuth(
        email,
        name,
        'twitter',
        profile.id
    );
    
    const token = generateToken(user);
    
    return { user, token };
};

/**
 * Handle Reddit OAuth callback
 */
export const handleRedditOAuth = async (
    profile: OAuthProfile
): Promise<AuthResult> => {
    const email = profile.email || `${profile.username}@reddit.com`;
    const name = profile.name || profile.username || 'Reddit User';
    
    const user = await findOrCreateUserByOAuth(
        email,
        name,
        'reddit',
        profile.id
    );
    
    const token = generateToken(user);
    
    return { user, token };
};

/**
 * Handle Google OAuth callback
 */
export const handleGoogleOAuth = async (
    profile: OAuthProfile
): Promise<AuthResult> => {
    const email = profile.email || `${profile.username}@google.com`;
    const name = profile.name || profile.username || 'Google User';
    
    const user = await findOrCreateUserByOAuth(
        email,
        name,
        'google',
        profile.id
    );
    
    const token = generateToken(user);
    
    return { user, token };
};
