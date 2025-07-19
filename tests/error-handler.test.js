const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const {
  ErrorHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  createError,
  ERROR_CODES
} = require('../middleware/errorHandler');

describe('Error Handler Middleware', () => {
  let app;
  let errorHandler;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    errorHandler = new ErrorHandler();
  });

  describe('Custom Error Classes', () => {
    test('AppError should create error with correct properties', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR', { field: 'test' });

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('TEST_ERROR');
      expect(error.details).toEqual({ field: 'test' });
      expect(error.isOperational).toBe(true);
      expect(error.timestamp).toBeDefined();
    });

    test('ValidationError should have correct defaults', () => {
      const error = new ValidationError('Validation failed');

      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('VALIDATION_ERROR');
      expect(error.isOperational).toBe(true);
    });

    test('AuthenticationError should have correct defaults', () => {
      const error = new AuthenticationError();

      expect(error.message).toBe('Authentication failed');
      expect(error.statusCode).toBe(401);
      expect(error.errorCode).toBe('AUTHENTICATION_ERROR');
    });

    test('AuthorizationError should have correct defaults', () => {
      const error = new AuthorizationError();

      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.errorCode).toBe('AUTHORIZATION_ERROR');
    });

    test('NotFoundError should have correct defaults', () => {
      const error = new NotFoundError('User');

      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('NOT_FOUND_ERROR');
    });

    test('ConflictError should have correct defaults', () => {
      const error = new ConflictError('Email already exists');

      expect(error.message).toBe('Email already exists');
      expect(error.statusCode).toBe(409);
      expect(error.errorCode).toBe('CONFLICT_ERROR');
    });

    test('RateLimitError should have correct defaults', () => {
      const error = new RateLimitError();

      expect(error.message).toBe('Too many requests');
      expect(error.statusCode).toBe(429);
      expect(error.errorCode).toBe('RATE_LIMIT_ERROR');
    });

    test('DatabaseError should have correct defaults', () => {
      const error = new DatabaseError();

      expect(error.message).toBe('Database operation failed');
      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBe('DATABASE_ERROR');
    });

    test('ExternalServiceError should have correct defaults', () => {
      const error = new ExternalServiceError('PaymentGateway', 'Service timeout');

      expect(error.message).toBe('PaymentGateway: Service timeout');
      expect(error.statusCode).toBe(503);
      expect(error.errorCode).toBe('EXTERNAL_SERVICE_ERROR');
    });
  });

  describe('Error Handler Methods', () => {
    test('should handle MongoDB CastError', () => {
      const castError = {
        name: 'CastError',
        path: '_id',
        value: 'invalid-id'
      };

      const result = errorHandler.handleCastError(castError);

      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toBe('Invalid _id: invalid-id');
    });

    test('should handle MongoDB duplicate key error', () => {
      const duplicateError = {
        code: 11000,
        keyValue: { email: 'test@example.com' }
      };

      const result = errorHandler.handleDuplicateKeyError(duplicateError);

      expect(result).toBeInstanceOf(ConflictError);
      expect(result.message).toBe("email 'test@example.com' already exists");
    });

    test('should handle Mongoose validation error', () => {
      const validationError = {
        name: 'ValidationError',
        errors: {
          name: {
            path: 'name',
            message: 'Name is required',
            value: ''
          },
          email: {
            path: 'email',
            message: 'Invalid email format',
            value: 'invalid-email'
          }
        }
      };

      const result = errorHandler.handleValidationError(validationError);

      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toBe('Validation failed');
      expect(result.details).toHaveLength(2);
      expect(result.details[0]).toEqual({
        field: 'name',
        message: 'Name is required',
        value: ''
      });
    });

    test('should handle JWT errors', () => {
      const jwtError = { name: 'JsonWebTokenError' };
      const result = errorHandler.handleJWTError(jwtError);

      expect(result).toBeInstanceOf(AuthenticationError);
      expect(result.message).toBe('Invalid token');
    });

    test('should handle JWT expired error', () => {
      const expiredError = { name: 'TokenExpiredError' };
      const result = errorHandler.handleJWTExpiredError(expiredError);

      expect(result).toBeInstanceOf(AuthenticationError);
      expect(result.message).toBe('Token expired');
    });

    test('should handle JSON parse error', () => {
      const parseError = { type: 'entity.parse.failed' };
      const result = errorHandler.handleJSONParseError(parseError);

      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toBe('Invalid JSON format');
    });

    test('should handle file size error', () => {
      const fileSizeError = { code: 'LIMIT_FILE_SIZE' };
      const result = errorHandler.handleFileSizeError(fileSizeError);

      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toBe('File size too large');
    });

    test('should handle network errors', () => {
      const networkError = { code: 'ENOTFOUND' };
      const result = errorHandler.handleNetworkError(networkError);

      expect(result).toBeInstanceOf(ExternalServiceError);
      expect(result.message).toBe('Network: Connection failed');
    });
  });

  describe('Error Response Handling', () => {
    test('should send proper error response', async () => {
      app.get('/test-error', (req, res, next) => {
        next(new ValidationError('Test validation error', [{ field: 'test', message: 'Test message' }]));
      });

      app.use(errorHandler.handle());

      const response = await request(app)
        .get('/test-error');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: {
          message: 'Test validation error',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          timestamp: expect.any(String),
          details: [{ field: 'test', message: 'Test message' }]
        }
      });
    });

    test('should include stack trace in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const devErrorHandler = new ErrorHandler({ includeStack: true });

      app.get('/test-error', (req, res, next) => {
        next(new AppError('Test error', 500));
      });

      app.use(devErrorHandler.handle());

      const response = await request(app)
        .get('/test-error');

      expect(response.status).toBe(500);
      expect(response.body.error.stack).toBeDefined();
      expect(response.body.error.request).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    test('should handle non-operational errors', async () => {
      app.get('/test-error', (req, res, next) => {
        const error = new Error('Non-operational error');
        error.statusCode = 500;
        next(error);
      });

      app.use(errorHandler.handle());

      const response = await request(app)
        .get('/test-error');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('Static Helper Methods', () => {
    test('asyncHandler should catch async errors', async () => {
      const asyncFunction = async (req, res, next) => {
        throw new ValidationError('Async error');
      };

      app.get('/test-async', ErrorHandler.asyncHandler(asyncFunction));
      app.use(errorHandler.handle());

      const response = await request(app)
        .get('/test-async');

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Async error');
    });

    test('notFoundHandler should handle 404 routes', async () => {
      app.use(ErrorHandler.notFoundHandler());
      app.use(errorHandler.handle());

      const response = await request(app)
        .get('/non-existent-route');

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Route /non-existent-route not found');
    });

    test('rateLimitHandler should handle rate limit errors', async () => {
      app.get('/test-rate-limit', ErrorHandler.rateLimitHandler());
      app.use(errorHandler.handle());

      const response = await request(app)
        .get('/test-rate-limit');

      expect(response.status).toBe(429);
      expect(response.body.error.message).toBe('Too many requests, please try again later');
    });
  });

  describe('Error Creation Helpers', () => {
    test('createError helpers should create correct error types', () => {
      expect(createError.validation('Test')).toBeInstanceOf(ValidationError);
      expect(createError.authentication('Test')).toBeInstanceOf(AuthenticationError);
      expect(createError.authorization('Test')).toBeInstanceOf(AuthorizationError);
      expect(createError.notFound('Test')).toBeInstanceOf(NotFoundError);
      expect(createError.conflict('Test')).toBeInstanceOf(ConflictError);
      expect(createError.rateLimit('Test')).toBeInstanceOf(RateLimitError);
      expect(createError.database('Test')).toBeInstanceOf(DatabaseError);
      expect(createError.externalService('Service', 'Test')).toBeInstanceOf(ExternalServiceError);
      expect(createError.general('Test', 500, 'TEST')).toBeInstanceOf(AppError);
    });
  });

  describe('Error Constants', () => {
    test('ERROR_CODES should contain all error codes', () => {
      expect(ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ERROR_CODES.AUTHENTICATION_ERROR).toBe('AUTHENTICATION_ERROR');
      expect(ERROR_CODES.AUTHORIZATION_ERROR).toBe('AUTHORIZATION_ERROR');
      expect(ERROR_CODES.NOT_FOUND_ERROR).toBe('NOT_FOUND_ERROR');
      expect(ERROR_CODES.CONFLICT_ERROR).toBe('CONFLICT_ERROR');
      expect(ERROR_CODES.RATE_LIMIT_ERROR).toBe('RATE_LIMIT_ERROR');
      expect(ERROR_CODES.DATABASE_ERROR).toBe('DATABASE_ERROR');
      expect(ERROR_CODES.EXTERNAL_SERVICE_ERROR).toBe('EXTERNAL_SERVICE_ERROR');
      expect(ERROR_CODES.INTERNAL_SERVER_ERROR).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('Integration with Express App', () => {
    test('should handle multiple error types in sequence', async () => {
      app.get('/cast-error', (req, res, next) => {
        const error = new Error('Cast error');
        error.name = 'CastError';
        error.path = '_id';
        error.value = 'invalid';
        next(error);
      });

      app.get('/duplicate-error', (req, res, next) => {
        const error = new Error('Duplicate error');
        error.code = 11000;
        error.keyValue = { email: 'test@test.com' };
        next(error);
      });

      app.get('/validation-error', (req, res, next) => {
        const error = new Error('Validation error');
        error.name = 'ValidationError';
        error.errors = {
          name: {
            path: 'name',
            message: 'Name required',
            value: null
          }
        };
        next(error);
      });

      app.use(errorHandler.handle());

      // Test CastError
      let response = await request(app).get('/cast-error');
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');

      // Test Duplicate Error
      response = await request(app).get('/duplicate-error');
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT_ERROR');

      // Test Validation Error
      response = await request(app).get('/validation-error');
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should log errors when logging is enabled', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const loggingErrorHandler = new ErrorHandler({ logErrors: true });

      app.get('/test-logging', (req, res, next) => {
        next(new AppError('Test error for logging', 500));
      });

      app.use(loggingErrorHandler.handle());

      await request(app).get('/test-logging');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('should handle errors without logging when disabled', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const noLoggingErrorHandler = new ErrorHandler({ logErrors: false });

      app.get('/test-no-logging', (req, res, next) => {
        next(new AppError('Test error without logging', 500));
      });

      app.use(noLoggingErrorHandler.handle());

      await request(app).get('/test-no-logging');

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Error Logging', () => {
    test('should log server errors with error level', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const req = {
        method: 'GET',
        originalUrl: '/test',
        ip: '127.0.0.1',
        get: () => 'test-agent',
        user: { id: 'user123' }
      };

      const error = new AppError('Server error', 500);
      errorHandler.logError(error, req);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Server Error:',
        expect.stringContaining('Server error')
      );

      consoleSpy.mockRestore();
    });

    test('should log client errors with warn level', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const req = {
        method: 'GET',
        originalUrl: '/test',
        ip: '127.0.0.1',
        get: () => 'test-agent'
      };

      const error = new ValidationError('Client error');
      errorHandler.logError(error, req);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Client Error:',
        expect.stringContaining('Client error')
      );

      consoleSpy.mockRestore();
    });
  });
});