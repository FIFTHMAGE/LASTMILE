const mongoose = require('mongoose');

class AppError extends Error {
  constructor(message, statusCode, errorCode = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
  }
}

class ErrorHandler {
  constructor(options = {}) {
    this.options = {
      includeStack: process.env.NODE_ENV === 'development',
      logErrors: true,
      ...options
    };
  }

  handle() {
    return (err, req, res, next) => {
      let error = { ...err };
      error.message = err.message;

      if (this.options.logErrors) {
        console.error('Error:', err.message);
        if (this.options.includeStack) {
          console.error('Stack:', err.stack);
        }
      }

      if (err.name === 'CastError') {
        error = new ValidationError(`Invalid ${err.path}: ${err.value}`);
      } else if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const value = err.keyValue[field];
        error = new ValidationError(`${field} '${value}' already exists`);
      } else if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(val => ({
          field: val.path,
          message: val.message,
          value: val.value
        }));
        error = new ValidationError('Validation failed', errors);
      } else if (err.name === 'JsonWebTokenError') {
        error = new AuthenticationError('Invalid token');
      } else if (err.name === 'TokenExpiredError') {
        error = new AuthenticationError('Token expired');
      }

      if (!error.isOperational) {
        error = new AppError(
          process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
          error.statusCode || 500,
          'INTERNAL_SERVER_ERROR'
        );
      }

      this.sendErrorResponse(error, req, res);
    };
  }

  sendErrorResponse(err, req, res) {
    const response = {
      success: false,
      error: {
        message: err.message,
        code: err.errorCode || 'UNKNOWN_ERROR',
        statusCode: err.statusCode || 500,
        timestamp: err.timestamp || new Date().toISOString()
      }
    };

    if (err.details) {
      response.error.details = err.details;
    }

    if (this.options.includeStack && err.stack) {
      response.error.stack = err.stack;
    }

    res.status(err.statusCode || 500).json(response);
  }

  static notFoundHandler() {
    return (req, res, next) => {
      const error = new NotFoundError(`Route ${req.originalUrl}`);
      next(error);
    };
  }

  static badRequest(res, message, details = null) {
    return res.status(400).json({
      success: false,
      error: {
        message,
        code: 'BAD_REQUEST',
        statusCode: 400,
        details,
        timestamp: new Date().toISOString()
      }
    });
  }

  static unauthorized(res, message = 'Unauthorized') {
    return res.status(401).json({
      success: false,
      error: {
        message,
        code: 'UNAUTHORIZED',
        statusCode: 401,
        timestamp: new Date().toISOString()
      }
    });
  }

  static forbidden(res, message = 'Forbidden') {
    return res.status(403).json({
      success: false,
      error: {
        message,
        code: 'FORBIDDEN',
        statusCode: 403,
        timestamp: new Date().toISOString()
      }
    });
  }

  static notFound(res, message = 'Not found') {
    return res.status(404).json({
      success: false,
      error: {
        message,
        code: 'NOT_FOUND',
        statusCode: 404,
        timestamp: new Date().toISOString()
      }
    });
  }

  static serverError(res, message = 'Internal server error', error = null) {
    const response = {
      success: false,
      error: {
        message,
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    };

    if (process.env.NODE_ENV === 'development' && error) {
      response.error.details = error.message;
      response.error.stack = error.stack;
    }

    return res.status(500).json(response);
  }
}

const createError = {
  validation: (message, details) => new ValidationError(message, details),
  authentication: (message) => new AuthenticationError(message),
  authorization: (message) => new AuthorizationError(message),
  notFound: (resource) => new NotFoundError(resource)
};

module.exports = {
  ErrorHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  createError
};