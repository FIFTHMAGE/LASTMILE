const axios = require('axios');

class LocationService {
  constructor() {
    // Use OpenStreetMap Nominatim API as default (free)
    this.nominatimBaseUrl = 'https://nominatim.openstreetmap.org';
    
    // Google Maps API configuration (if API key is provided)
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.googleMapsBaseUrl = 'https://maps.googleapis.com/maps/api';
    
    // Request headers for Nominatim (required by their usage policy)
    this.nominatimHeaders = {
      'User-Agent': 'LastMileDeliveryPlatform/1.0 (contact@lastmile.com)'
    };

    // Simple in-memory cache for geocoding results
    this.geocodeCache = new Map();
    this.cacheMaxSize = 1000;
    this.cacheExpiryMs = 24 * 60 * 60 * 1000; // 24 hours

    // Rate limiting configuration
    this.rateLimits = {
      nominatim: {
        requestsPerSecond: 1,
        lastRequest: 0
      },
      google: {
        requestsPerSecond: 50,
        lastRequest: 0
      }
    };

    // Retry configuration
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 10000  // 10 seconds
    };
  }

  /**
   * Geocode an address to get coordinates with caching and retry logic
   * @param {string} address - The address to geocode
   * @param {object} options - Additional options
   * @returns {Promise<object>} - Geocoding result with coordinates
   */
  async geocodeAddress(address, options = {}) {
    if (typeof address !== 'string') {
      throw new Error('Valid address string is required');
    }

    const trimmedAddress = address.trim();
    if (trimmedAddress.length === 0) {
      throw new Error('Address cannot be empty');
    }

    // Check cache first
    const cacheKey = `geocode:${trimmedAddress.toLowerCase()}`;
    const cached = this._getFromCache(cacheKey);
    if (cached && !options.skipCache) {
      return cached;
    }

    try {
      let result;
      
      // Try Google Maps API first if API key is available
      if (this.googleMapsApiKey && options.preferGoogle !== false) {
        result = await this._geocodeWithRetry(() => this._geocodeWithGoogle(trimmedAddress), 'google');
      } else {
        // Fall back to Nominatim
        result = await this._geocodeWithRetry(() => this._geocodeWithNominatim(trimmedAddress), 'nominatim');
      }

      // Cache the result
      this._setCache(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Geocoding error:', error.message);
      throw new Error(`Failed to geocode address: ${error.message}`);
    }
  }

  /**
   * Batch geocode multiple addresses
   * @param {string[]} addresses - Array of addresses to geocode
   * @param {object} options - Additional options
   * @returns {Promise<object[]>} - Array of geocoding results
   */
  async batchGeocodeAddresses(addresses, options = {}) {
    if (!Array.isArray(addresses)) {
      throw new Error('Addresses must be an array');
    }

    if (addresses.length === 0) {
      return [];
    }

    if (addresses.length > 100) {
      throw new Error('Maximum 100 addresses allowed per batch');
    }

    const results = [];
    const batchSize = options.batchSize || 10;
    const delay = options.delay || 100; // ms between requests

    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const batchPromises = batch.map(async (address, index) => {
        try {
          // Add small delay between requests to respect rate limits
          if (index > 0) {
            await this._delay(delay);
          }
          
          const result = await this.geocodeAddress(address, options);
          return { address, success: true, result };
        } catch (error) {
          return { address, success: false, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches
      if (i + batchSize < addresses.length) {
        await this._delay(delay * 2);
      }
    }

    return results;
  }

  /**
   * Reverse geocode coordinates to get address
   * @param {number[]} coordinates - [longitude, latitude]
   * @param {object} options - Additional options
   * @returns {Promise<object>} - Reverse geocoding result with address
   */
  async reverseGeocode(coordinates, options = {}) {
    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      throw new Error('Coordinates must be an array of [longitude, latitude]');
    }

    const [lng, lat] = coordinates;
    
    if (typeof lng !== 'number' || typeof lat !== 'number') {
      throw new Error('Coordinates must be numbers');
    }

    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      throw new Error('Invalid coordinate ranges');
    }

    try {
      // Try Google Maps API first if API key is available
      if (this.googleMapsApiKey && options.preferGoogle !== false) {
        return await this._reverseGeocodeWithGoogle(lng, lat);
      }
      
      // Fall back to Nominatim
      return await this._reverseGeocodeWithNominatim(lng, lat);
    } catch (error) {
      console.error('Reverse geocoding error:', error.message);
      throw new Error(`Failed to reverse geocode coordinates: ${error.message}`);
    }
  }

  /**
   * Validate an address by attempting to geocode it
   * @param {string} address - The address to validate
   * @returns {Promise<object>} - Validation result
   */
  async validateAddress(address) {
    try {
      const result = await this.geocodeAddress(address);
      return {
        isValid: true,
        address: result.formattedAddress,
        coordinates: result.coordinates,
        confidence: result.confidence || 'medium'
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message,
        address: address
      };
    }
  }

  /**
   * Calculate route between two points (basic implementation)
   * @param {number[]} origin - [longitude, latitude]
   * @param {number[]} destination - [longitude, latitude]
   * @returns {Promise<object>} - Route information
   */
  async calculateRoute(origin, destination) {
    if (!Array.isArray(origin) || !Array.isArray(destination)) {
      throw new Error('Origin and destination must be coordinate arrays');
    }

    // For now, return straight-line distance and estimated time
    // In production, you'd use a routing service like Google Directions API
    const distance = this._calculateDistance(origin, destination);
    const estimatedTime = this._estimateTime(distance);

    return {
      distance: Math.round(distance),
      duration: Math.round(estimatedTime),
      route: 'direct', // Placeholder - would contain actual route points
      instructions: ['Head towards destination'], // Placeholder
      method: 'straight-line-calculation'
    };
  }

  /**
   * Update rider location (placeholder for real-time tracking)
   * @param {string} riderId - The rider's ID
   * @param {number[]} coordinates - [longitude, latitude]
   * @returns {Promise<object>} - Update result
   */
  async updateRiderLocation(riderId, coordinates) {
    // This would typically update a real-time database
    // For now, just validate the coordinates
    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      throw new Error('Invalid coordinates format');
    }

    const [lng, lat] = coordinates;
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      throw new Error('Coordinates out of valid range');
    }

    return {
      riderId,
      coordinates,
      timestamp: new Date(),
      status: 'updated'
    };
  }

  /**
   * Find nearby riders (placeholder implementation)
   * @param {number[]} coordinates - [longitude, latitude]
   * @param {number} radius - Search radius in meters
   * @returns {Promise<array>} - Array of nearby riders
   */
  async getNearbyRiders(coordinates, radius = 5000) {
    // This would query a real-time database of rider locations
    // For now, return empty array
    return [];
  }

  // Private methods for different geocoding services

  async _geocodeWithGoogle(address) {
    const url = `${this.googleMapsBaseUrl}/geocode/json`;
    const params = {
      address: address,
      key: this.googleMapsApiKey
    };

    const response = await axios.get(url, { params, timeout: 5000 });
    
    if (response.data.status !== 'OK') {
      throw new Error(`Google Geocoding API error: ${response.data.status}`);
    }

    if (!response.data.results || response.data.results.length === 0) {
      throw new Error('No results found for the given address');
    }

    const result = response.data.results[0];
    const location = result.geometry.location;

    return {
      coordinates: [location.lng, location.lat],
      formattedAddress: result.formatted_address,
      confidence: this._mapGoogleConfidence(result.geometry.location_type),
      components: this._parseGoogleComponents(result.address_components),
      provider: 'google'
    };
  }

  async _geocodeWithNominatim(address) {
    const url = `${this.nominatimBaseUrl}/search`;
    const params = {
      q: address,
      format: 'json',
      limit: 1,
      addressdetails: 1
    };

    const response = await axios.get(url, { 
      params, 
      headers: this.nominatimHeaders,
      timeout: 5000 
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No results found for the given address');
    }

    const result = response.data[0];

    return {
      coordinates: [parseFloat(result.lon), parseFloat(result.lat)],
      formattedAddress: result.display_name,
      confidence: this._mapNominatimConfidence(result.importance),
      components: this._parseNominatimComponents(result.address),
      provider: 'nominatim'
    };
  }

  async _reverseGeocodeWithGoogle(lng, lat) {
    const url = `${this.googleMapsBaseUrl}/geocode/json`;
    const params = {
      latlng: `${lat},${lng}`,
      key: this.googleMapsApiKey
    };

    const response = await axios.get(url, { params, timeout: 5000 });
    
    if (response.data.status !== 'OK') {
      throw new Error(`Google Reverse Geocoding API error: ${response.data.status}`);
    }

    if (!response.data.results || response.data.results.length === 0) {
      throw new Error('No address found for the given coordinates');
    }

    const result = response.data.results[0];

    return {
      address: result.formatted_address,
      components: this._parseGoogleComponents(result.address_components),
      provider: 'google'
    };
  }

  async _reverseGeocodeWithNominatim(lng, lat) {
    const url = `${this.nominatimBaseUrl}/reverse`;
    const params = {
      lat: lat,
      lon: lng,
      format: 'json',
      addressdetails: 1
    };

    const response = await axios.get(url, { 
      params, 
      headers: this.nominatimHeaders,
      timeout: 5000 
    });

    if (!response.data) {
      throw new Error('No address found for the given coordinates');
    }

    return {
      address: response.data.display_name,
      components: this._parseNominatimComponents(response.data.address),
      provider: 'nominatim'
    };
  }

  // Helper methods

  _calculateDistance(coords1, coords2) {
    const [lng1, lat1] = coords1;
    const [lng2, lat2] = coords2;
    
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  }

  _estimateTime(distance) {
    // Estimate time based on average city driving speed (25 km/h)
    const averageSpeed = 25000; // meters per hour
    return (distance / averageSpeed) * 60; // minutes
  }

  _mapGoogleConfidence(locationType) {
    const confidenceMap = {
      'ROOFTOP': 'high',
      'RANGE_INTERPOLATED': 'medium',
      'GEOMETRIC_CENTER': 'medium',
      'APPROXIMATE': 'low'
    };
    return confidenceMap[locationType] || 'medium';
  }

  _mapNominatimConfidence(importance) {
    if (importance >= 0.7) return 'high';
    if (importance >= 0.4) return 'medium';
    return 'low';
  }

  _parseGoogleComponents(components) {
    const parsed = {};
    components.forEach(component => {
      const types = component.types;
      if (types.includes('street_number')) {
        parsed.streetNumber = component.long_name;
      } else if (types.includes('route')) {
        parsed.street = component.long_name;
      } else if (types.includes('locality')) {
        parsed.city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        parsed.state = component.short_name;
      } else if (types.includes('postal_code')) {
        parsed.zipCode = component.long_name;
      } else if (types.includes('country')) {
        parsed.country = component.long_name;
      }
    });
    return parsed;
  }

  _parseNominatimComponents(address) {
    return {
      streetNumber: address.house_number,
      street: address.road,
      city: address.city || address.town || address.village,
      state: address.state,
      zipCode: address.postcode,
      country: address.country
    };
  }

  // Enhanced helper methods for caching, retry logic, and rate limiting

  /**
   * Get item from cache if not expired
   * @param {string} key - Cache key
   * @returns {object|null} - Cached item or null
   */
  _getFromCache(key) {
    const item = this.geocodeCache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > this.cacheExpiryMs) {
      this.geocodeCache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * Set item in cache with timestamp
   * @param {string} key - Cache key
   * @param {object} data - Data to cache
   */
  _setCache(key, data) {
    // Clean cache if it's getting too large
    if (this.geocodeCache.size >= this.cacheMaxSize) {
      this._cleanCache();
    }

    this.geocodeCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clean expired items from cache
   */
  _cleanCache() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, item] of this.geocodeCache.entries()) {
      if (now - item.timestamp > this.cacheExpiryMs) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.geocodeCache.delete(key));

    // If still too large, remove oldest items
    if (this.geocodeCache.size >= this.cacheMaxSize) {
      const entries = Array.from(this.geocodeCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const itemsToRemove = entries.slice(0, Math.floor(this.cacheMaxSize * 0.2));
      itemsToRemove.forEach(([key]) => this.geocodeCache.delete(key));
    }
  }

  /**
   * Execute geocoding function with retry logic
   * @param {Function} geocodeFunction - Function to execute
   * @param {string} provider - Provider name for rate limiting
   * @returns {Promise<object>} - Geocoding result
   */
  async _geocodeWithRetry(geocodeFunction, provider) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        // Apply rate limiting
        await this._applyRateLimit(provider);
        
        // Execute the geocoding function
        return await geocodeFunction();
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (this._isNonRetryableError(error)) {
          throw error;
        }
        
        // Don't retry on the last attempt
        if (attempt === this.retryConfig.maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(2, attempt),
          this.retryConfig.maxDelay
        );
        
        console.warn(`Geocoding attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
        await this._delay(delay);
      }
    }
    
    throw lastError;
  }

  /**
   * Apply rate limiting for API requests
   * @param {string} provider - Provider name
   */
  async _applyRateLimit(provider) {
    const rateLimit = this.rateLimits[provider];
    if (!rateLimit) return;

    const now = Date.now();
    const timeSinceLastRequest = now - rateLimit.lastRequest;
    const minInterval = 1000 / rateLimit.requestsPerSecond;

    if (timeSinceLastRequest < minInterval) {
      const delay = minInterval - timeSinceLastRequest;
      await this._delay(delay);
    }

    this.rateLimits[provider].lastRequest = Date.now();
  }

  /**
   * Check if error should not be retried
   * @param {Error} error - Error to check
   * @returns {boolean} - True if error should not be retried
   */
  _isNonRetryableError(error) {
    const nonRetryableMessages = [
      'No results found',
      'Invalid coordinate ranges',
      'Coordinates must be numbers',
      'Valid address string is required',
      'Address cannot be empty',
      'ZERO_RESULTS',
      'INVALID_REQUEST',
      'REQUEST_DENIED'
    ];

    return nonRetryableMessages.some(msg => 
      error.message.includes(msg)
    );
  }

  /**
   * Delay execution for specified milliseconds
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} - Promise that resolves after delay
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Enhanced address validation with detailed analysis
   * @param {string} address - Address to validate
   * @param {object} options - Validation options
   * @returns {Promise<object>} - Detailed validation result
   */
  async validateAddressDetailed(address, options = {}) {
    try {
      const result = await this.geocodeAddress(address, options);
      
      // Analyze address completeness
      const completeness = this._analyzeAddressCompleteness(result.components);
      
      // Check if coordinates are in a reasonable location
      const locationCheck = this._validateCoordinateLocation(result.coordinates);
      
      return {
        isValid: true,
        address: result.formattedAddress,
        coordinates: result.coordinates,
        confidence: result.confidence,
        completeness,
        locationCheck,
        components: result.components,
        provider: result.provider,
        suggestions: this._generateAddressSuggestions(result.components)
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message,
        address: address,
        suggestions: this._generateErrorSuggestions(error.message)
      };
    }
  }

  /**
   * Analyze address completeness
   * @param {object} components - Address components
   * @returns {object} - Completeness analysis
   */
  _analyzeAddressCompleteness(components) {
    const requiredFields = ['street', 'city', 'state', 'country'];
    const optionalFields = ['streetNumber', 'zipCode'];
    
    const present = [];
    const missing = [];
    
    requiredFields.forEach(field => {
      if (components[field]) {
        present.push(field);
      } else {
        missing.push(field);
      }
    });
    
    optionalFields.forEach(field => {
      if (components[field]) {
        present.push(field);
      }
    });
    
    const score = (present.length / (requiredFields.length + optionalFields.length)) * 100;
    
    return {
      score: Math.round(score),
      present,
      missing,
      isComplete: missing.length === 0
    };
  }

  /**
   * Validate coordinate location reasonableness
   * @param {number[]} coordinates - [longitude, latitude]
   * @returns {object} - Location validation result
   */
  _validateCoordinateLocation(coordinates) {
    const [lng, lat] = coordinates;
    
    // Check if coordinates are at null island (0,0)
    const isNullIsland = Math.abs(lng) < 0.1 && Math.abs(lat) < 0.1;
    
    // Simple land check - most populated areas are reasonable
    // This is a basic check, in production you'd use a more sophisticated service
    const isLikelyReasonable = !isNullIsland && (
      Math.abs(lng) > 0.1 || Math.abs(lat) > 0.1
    );
    
    return {
      isReasonable: isLikelyReasonable,
      isNullIsland,
      warnings: [
        ...(isNullIsland ? ['Coordinates appear to be at Null Island (0,0)'] : []),
        ...(!isLikelyReasonable ? ['Coordinates may need verification'] : [])
      ]
    };
  }

  /**
   * Generate address improvement suggestions
   * @param {object} components - Address components
   * @returns {string[]} - Array of suggestions
   */
  _generateAddressSuggestions(components) {
    const suggestions = [];
    
    if (!components.streetNumber) {
      suggestions.push('Consider including a street number for more precise location');
    }
    
    if (!components.zipCode) {
      suggestions.push('Adding a ZIP/postal code can improve geocoding accuracy');
    }
    
    if (!components.state && components.country === 'USA') {
      suggestions.push('Including the state can help with address disambiguation');
    }
    
    return suggestions;
  }

  /**
   * Generate suggestions based on error message
   * @param {string} errorMessage - Error message
   * @returns {string[]} - Array of suggestions
   */
  _generateErrorSuggestions(errorMessage) {
    const suggestions = [];
    
    if (errorMessage.includes('No results found')) {
      suggestions.push('Try using a more complete address with street, city, and state');
      suggestions.push('Check for typos in the address');
      suggestions.push('Try using a nearby landmark or intersection');
    }
    
    if (errorMessage.includes('timeout')) {
      suggestions.push('The geocoding service may be temporarily unavailable');
      suggestions.push('Try again in a few moments');
    }
    
    return suggestions;
  }

  /**
   * Get cache statistics
   * @returns {object} - Cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [, item] of this.geocodeCache.entries()) {
      if (now - item.timestamp > this.cacheExpiryMs) {
        expiredCount++;
      }
    }
    
    return {
      totalItems: this.geocodeCache.size,
      expiredItems: expiredCount,
      activeItems: this.geocodeCache.size - expiredCount,
      maxSize: this.cacheMaxSize,
      expiryMs: this.cacheExpiryMs
    };
  }

  /**
   * Clear the geocoding cache
   */
  clearCache() {
    this.geocodeCache.clear();
  }
}

module.exports = LocationService;