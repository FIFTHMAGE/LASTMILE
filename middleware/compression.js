/**
 * Compression Middleware
 * Provides response compression for API endpoints
 */

const compression = require('compression');

class CompressionMiddleware {
  /**
   * Create compression middleware for API responses
   */
  static api() {
    return compression({
      // Only compress responses larger than 1kb
      threshold: 1024,
      
      // Compression level (1-9, 6 is default)
      level: 6,
      
      // Only compress specific content types
      filter: (req, res) => {
        // Don't compress if the request includes a cache-control no-transform directive
        if (req.headers['cache-control'] && req.headers['cache-control'].includes('no-transform')) {
          return false;
        }
        
        // Use compression filter function
        return compression.filter(req, res);
      }
    });
  }
}

module.exports = CompressionMiddleware;