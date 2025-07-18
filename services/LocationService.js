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
  }

  /**
   * Geocode an address to get coordinates
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

    try {
      // Try Google Maps API first if API key is available
      if (this.googleMapsApiKey && options.preferGoogle !== false) {
        return await this._geocodeWithGoogle(trimmedAddress);
      }
      
      // Fall back to Nominatim
      return await this._geocodeWithNominatim(trimmedAddress);
    } catch (error) {
      console.error('Geocoding error:', error.message);
      throw new Error(`Failed to geocode address: ${error.message}`);
    }
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
}

module.exports = LocationService;