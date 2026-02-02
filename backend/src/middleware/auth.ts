import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { generateCSRFToken as generateCSRFTokenFromService } from '../services/security/securityService';
import { securityLogger } from '../utils/logger';
import { SessionData } from 'express-session';

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                name: string;
                oauthProvider: string;
                oauthId: string;
            };
            csrfToken?: string;
        }
    }
}

// Extend session type to include csrfToken
declare module 'express-session' {
    interface SessionData {
        csrfToken?: string;
    }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate a JWT token for a user
 */
export const generateToken = (user: {
    id: string;
    email: string;
    name: string;
    oauthProvider: string;
    oauthId: string;
}): string => {
    const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as any };
    
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            name: user.name,
            oauthProvider: user.oauthProvider,
            oauthId: user.oauthId,
        },
        JWT_SECRET,
        options
    );
};

/**
 * Verify a JWT token and return decoded payload
 */
export const verifyToken = (token: string): any => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};

/**
 * Generate CSRF token for session
 */
export const generateCSRFToken = (): string => {
    return generateCSRFTokenFromService();
};

/**
 * CSRF protection middleware
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
    // Skip CSRF for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    const csrfToken = req.headers['x-csrf-token'] as string;
    const sessionCSRFToken = req.session?.csrfToken;

    if (!csrfToken || !sessionCSRFToken || csrfToken !== sessionCSRFToken) {
        securityLogger.warn('CSRF token validation failed', {
            ip: req.ip,
            method: req.method,
            path: req.path,
        });
        res.status(403).json({ error: 'CSRF token validation failed' });
        return;
    }

    next();
};

/**
 * Provide CSRF token to client
 */
export const provideCSRFToken = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session?.csrfToken) {
        req.session.csrfToken = generateCSRFToken();
    }
    req.csrfToken = req.session.csrfToken;
    next();
};

/**
 * Authentication middleware to protect routes
 */
export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Unauthorized: No token provided' });
            return;
        }
        
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        const decoded = verifyToken(token);
        
        if (!decoded) {
            res.status(401).json({ error: 'Unauthorized: Invalid token' });
            return;
        }
        
        // Attach user to request
        req.user = decoded;
        next();
    } catch (error) {
        securityLogger.error('Authentication error', { error, ip: req.ip, path: req.path });
        res.status(401).json({ error: 'Unauthorized: Authentication failed' });
    }
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const optionalAuthenticate = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = verifyToken(token);
            
            if (decoded) {
                req.user = decoded;
            }
        }
        
        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
};
