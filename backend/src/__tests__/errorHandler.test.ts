import { errorHandler, notFoundHandler } from '../middleware/errorHandler';
import { Request, Response, NextFunction } from 'express';

describe('Error Handler Middleware', () => {
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

    describe('errorHandler', () => {
        it('should handle errors and pass to next', () => {
            const error = new Error('Test error');
            const mockNext = jest.fn();

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Test error',
            message: 'An error occurred',
            stack: expect.any(String),
            });
        });

        it('should handle 404 not found errors', () => {
            const mockRequest = {} as Partial<Request>;
            const mockResponse = {
                status: jest.fn().mockReturnValue(200),
                json: jest.fn().mockReturnValue({}),
            } as Partial<Response>;
            const mockNext = jest.fn();

            notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Not Found',
                message: 'Resource not found',
            });
        });
    });

    describe('notFoundHandler', () => {
        it('should return 404 for unknown routes', () => {
            const mockRequest = {
                url: '/api/unknown-route',
            } as Partial<Request>;
            const mockResponse = {
                status: jest.fn().mockReturnValue(200),
                json: jest.fn().mockReturnValue({}),
            } as Partial<Response>;
            const mockNext = jest.fn();

            notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Not Found',
                message: 'Resource not found',
            });
        });
    });
});
