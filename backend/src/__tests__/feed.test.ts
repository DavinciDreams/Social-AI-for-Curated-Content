import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { app } from '../server';

describe('Feed Service', () => {
    beforeEach(() => {
        // Mocks will be set up in each test
    });

    afterEach(() => {
        // Cleanup after each test
    });

    describe('GET /api/feeds', () => {
        it('should return feeds array', async () => {
            const mockApp = {
                get: jest.fn(),
            };

            const response = await request(mockApp)
                .get('/api/feeds')
                .expect(200);

            expect(response.body).toHaveProperty('items');
            expect(Array.isArray(response.body.items)).toBe(true);
        });

        it('should handle errors gracefully', async () => {
            const mockApp = {
                get: jest.fn(),
            };

            mockApp.get.mockImplementationOnce(() => {
                throw new Error('Database error');
            });

            const response = await request(mockApp)
                .get('/api/feeds')
                .expect(500);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('POST /api/config', () => {
        it('should update configuration', async () => {
            const mockApp = {
                get: jest.fn(),
            };

            const configData = {
                sources: ['twitter', 'reddit'],
                keywords: ['test'],
                minScore: 75,
            };

            const response = await request(mockApp)
                .post('/api/config')
                .send(configData)
                .expect(200);

            expect(response.body).toHaveProperty('success');
            expect(response.body.success).toBe(true);
        });
    });
});
