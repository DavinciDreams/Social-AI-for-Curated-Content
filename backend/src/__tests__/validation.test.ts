import { validate, validationSchemas } from '../middleware/validation';
import { Request, Response, NextFunction } from 'express';

describe('Validation Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        mockRequest = {} as Partial<Request>;
        mockResponse = {
            status: jest.fn().mockReturnValue(200),
            json: jest.fn().mockReturnValue({}),
        } as Partial<Response>;
        mockNext = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('validate middleware', () => {
        it('should validate request body with schema', () => {
            mockRequest.body = {
                email: 'test@example.com',
                name: 'Test User',
            };

            const schema = validationSchemas.auth.twitterAuth;

            // Create mock next function
            const mockNext = jest.fn();

            // Call validate with schema
            const middleware = validate(schema, 'body');
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            // Should call next if validation passes
            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should return 400 for invalid request body', () => {
            mockRequest.body = {
                email: 'invalid-email',
            };

            const schema = validationSchemas.auth.twitterAuth;

            const mockNext = jest.fn();

            const middleware = validate(schema, 'body');
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            // Should not call next if validation fails
            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Validation Error',
                details: expect.arrayContaining([
                    expect.objectContaining({
                        field: 'email',
                        message: expect.any(String),
                    }),
                ]),
            });
        });

        it('should validate query parameters with schema', () => {
            mockRequest.query = {
                page: '1',
                limit: '20',
            };

            const schema = validationSchemas.feed.getFeeds;

            const mockNext = jest.fn();

            const middleware = validate(schema, 'query');
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should validate params with schema', () => {
            mockRequest.params = {
                feedId: '123',
            };

            const schema = validationSchemas.saved.getSavedItems;

            const mockNext = jest.fn();

            const middleware = validate(schema, 'params');
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });
    });

    describe('sanitization middleware', () => {
        it('should sanitize string input', () => {
            const mockRequest = {
                body: {
                    malicious: '<script>alert("XSS")</script>',
                },
            };

            const mockNext = jest.fn();
            const mockResponse = {} as Partial<Response>;

            const middleware = require('../middleware/validation').sanitizeInput;
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockRequest.body.malicious).toBe('<script>alert("XSS")</script>');
            expect(mockNext).toHaveBeenCalled();
        });

        it('should sanitize object input recursively', () => {
            const mockRequest = {
                body: {
                    nested: {
                        malicious: '<script>alert("XSS")</script>',
                    },
                },
            };

            const mockNext = jest.fn();
            const mockResponse = {} as Partial<Response>;

            const middleware = require('../middleware/validation').sanitizeInput;
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockRequest.body.nested?.malicious).toBe('<script>alert("XSS")</script>');
            expect(mockNext).toHaveBeenCalled();
        });
    });
});
