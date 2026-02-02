import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { generateToken, verifyToken } from '../middleware/auth';

describe('Authentication Middleware', () => {
    let testToken: string;

    beforeEach(() => {
        testToken = generateToken({
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User',
            oauthProvider: 'twitter',
            oauthId: '123456789',
        });
    });

    afterEach(() => {
        testToken = '';
    });

    describe('generateToken', () => {
        it('should generate a valid JWT token', () => {
            const token = generateToken({
                id: 'test-user-id',
                email: 'test@example.com',
                name: 'Test User',
                oauthProvider: 'twitter',
                oauthId: '123456789',
            });

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.').length).toBe(3); // header.payload.signature
        });

        it('should generate different tokens for different users', () => {
            const token1 = generateToken({
                id: 'user1',
                email: 'user1@example.com',
                name: 'User 1',
                oauthProvider: 'twitter',
                oauthId: '123',
            });

            const token2 = generateToken({
                id: 'user2',
                email: 'user2@example.com',
                name: 'User 2',
                oauthProvider: 'google',
                oauthId: '456',
            });

            expect(token1).not.toBe(token2);
        });
    });

    describe('verifyToken', () => {
        it('should verify a valid token', () => {
            const validToken = generateToken({
                id: 'test-user-id',
                email: 'test@example.com',
                name: 'Test User',
                oauthProvider: 'twitter',
                oauthId: '123456789',
            });

            const decoded = verifyToken(validToken);

            expect(decoded).toBeDefined();
            expect(decoded.id).toBe('test-user-id');
            expect(decoded.email).toBe('test@example.com');
            expect(decoded.name).toBe('Test User');
            expect(decoded.oauthProvider).toBe('twitter');
            expect(decoded.oauthId).toBe('123456789');
        });

        it('should return null for invalid token', () => {
            const decoded = verifyToken('invalid.token');
            expect(decoded).toBeNull();
        });

        it('should return null for expired token', () => {
            const decoded = verifyToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIx');
            expect(decoded).toBeNull();
        });
    });

    describe('authenticate middleware', () => {
        it('should allow access with valid token', async () => {
            const validToken = generateToken({
                id: 'test-user-id',
                email: 'test@example.com',
                name: 'Test User',
                oauthProvider: 'twitter',
                oauthId: '123456789',
            });

            // Mock the app for testing
            const mockApp = {
                get: jest.fn(),
            };

            const response = await request(mockApp)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('id');
            expect(response.body.id).toBe('test-user-id');
        });

        it('should reject access without token', async () => {
            const mockApp = {
                get: jest.fn(),
            };

            const response = await request(mockApp)
                .get('/api/auth/me')
                .expect(401);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Unauthorized');
        });

        it('should reject access with invalid token', async () => {
            const mockApp = {
                get: jest.fn(),
            };

            const response = await request(mockApp)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid.token')
                .expect(401);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Unauthorized');
        });
    });

    describe('optionalAuthenticate middleware', () => {
        it('should allow access without token', async () => {
            const mockApp = {
                get: jest.fn(),
            };

            const response = await request(mockApp)
                .get('/api/auth/me')
                .expect(200);

            expect(response.body).toBeDefined();
        });

        it('should attach user when valid token is provided', async () => {
            const validToken = generateToken({
                id: 'test-user-id',
                email: 'test@example.com',
                name: 'Test User',
                oauthProvider: 'twitter',
                oauthId: '123456789',
            });

            const mockApp = {
                get: jest.fn(),
            };

            const response = await request(mockApp)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('id');
            expect(response.body.id).toBe('test-user-id');
        });
    });
});
