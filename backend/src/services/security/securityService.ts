import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { logger } from '../../utils/logger';

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;

/**
 * Hash a password using bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
    try {
        const salt = await bcrypt.genSalt(SALT_ROUNDS);
        return bcrypt.hash(password, salt);
    } catch (error) {
        logger.error('Error hashing password', { error });
        throw new Error('Failed to hash password');
    }
};

/**
 * Compare a plain text password with a hashed password
 */
export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
    try {
        return bcrypt.compare(password, hashedPassword);
    } catch (error) {
        logger.error('Error comparing password', { error });
        return false;
    }
};

/**
 * Generate access token
 */
export const generateAccessToken = (payload: any, expiresIn: string = '15m'): string => {
    const options: SignOptions = { expiresIn: expiresIn as any };
    return jwt.sign(payload, JWT_SECRET, options);
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (payload: any, expiresIn: string = '7d'): string => {
    const options: SignOptions = { expiresIn: expiresIn as any };
    return jwt.sign(payload, JWT_REFRESH_SECRET, options);
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token: string): any => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        logger.warn('Failed to verify access token', { error });
        return null;
    }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): any => {
    try {
        return jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (error) {
        logger.warn('Failed to verify refresh token', { error });
        return null;
    }
};

/**
 * Generate token pair (access + refresh)
 */
export const generateTokenPair = (user: {
    id: string;
    email: string;
    name: string;
    oauthProvider: string;
    oauthId: string;
}): { accessToken: string; refreshToken: string } => {
    const payload = {
        id: user.id,
        email: user.email,
        name: user.name,
        oauthProvider: user.oauthProvider,
        oauthId: user.oauthId,
    };

    return {
        accessToken: generateAccessToken(payload),
        refreshToken: generateRefreshToken(payload),
    };
};

/**
 * Rotate tokens - generate new pair from valid refresh token
 */
export const rotateTokens = (refreshToken: string): { accessToken: string; refreshToken: string } | null => {
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
        return null;
    }

    return generateTokenPair(decoded);
};

/**
 * Encrypt sensitive data at rest
 */
export const encrypt = (text: string): string => {
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const key = Buffer.from(ENCRYPTION_KEY, 'hex');
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
        logger.error('Error encrypting data', { error });
        throw new Error('Failed to encrypt data');
    }
};

/**
 * Decrypt sensitive data at rest
 */
export const decrypt = (encryptedText: string): string => {
    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 2) {
            throw new Error('Invalid encrypted text format');
        }
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const key = Buffer.from(ENCRYPTION_KEY, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        logger.error('Error decrypting data', { error });
        throw new Error('Failed to decrypt data');
    }
};

/**
 * Generate a random token for email verification, password reset, etc.
 */
export const generateRandomToken = (length: number = 32): string => {
    return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate CSRF token
 */
export const generateCSRFToken = (): string => {
    return crypto.randomBytes(32).toString('base64');
};

/**
 * Validate CSRF token
 */
export const validateCSRFToken = (token: string, sessionToken: string): boolean => {
    return token === sessionToken;
};

/**
 * Sanitize email address
 */
export const sanitizeEmail = (email: string): string => {
    return email.toLowerCase().trim();
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Generate secure random string
 */
export const generateSecureRandomString = (length: number = 16): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(crypto.randomInt(0, chars.length));
    }
    return result;
};

/**
 * Mask sensitive data for logging
 */
export const maskSensitiveData = (data: string, visibleChars: number = 4): string => {
    if (data.length <= visibleChars) {
        return '*'.repeat(data.length);
    }
    return data.substring(0, visibleChars) + '*'.repeat(data.length - visibleChars);
};

/**
 * Get token expiration time
 */
export const getTokenExpiration = (token: string): number | null => {
    try {
        const decoded = jwt.decode(token) as any;
        return decoded?.exp || null;
    } catch (error) {
        logger.warn('Failed to decode token', { error });
        return null;
    }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
    const exp = getTokenExpiration(token);
    if (!exp) return true;
    return Date.now() >= exp * 1000;
};

/**
 * Generate password reset token
 */
export const generatePasswordResetToken = (userId: string): { token: string; expiresAt: Date } => {
    const token = generateRandomToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    return { token, expiresAt };
};

/**
 * Hash API key
 */
export const hashApiKey = (apiKey: string): string => {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
};

/**
 * Verify API key
 */
export const verifyApiKey = (apiKey: string, hashedKey: string): boolean => {
    const hash = hashApiKey(apiKey);
    return hash === hashedKey;
};

export default {
    hashPassword,
    comparePassword,
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    generateTokenPair,
    rotateTokens,
    encrypt,
    decrypt,
    generateRandomToken,
    generateCSRFToken,
    validateCSRFToken,
    sanitizeEmail,
    isValidEmail,
    generateSecureRandomString,
    maskSensitiveData,
    getTokenExpiration,
    isTokenExpired,
    generatePasswordResetToken,
    hashApiKey,
    verifyApiKey,
};
