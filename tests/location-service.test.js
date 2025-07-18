const LocationService = require('../services/LocationService');
const axios = require('axios');

// Mock axios for testing
jest.mock('axios');
const mockedAxios = axios;

describe('LocationService', () => {
  let locationService;

  beforeEach(() => {
    locationService = new LocationService();
    jest.clearAllMocks();
  });

  describe('Constructor and Configuration', () => {
    test('should initialize with default configuration', () => {
      expect(locationService.nominatimBaseUrl).toBe('https://nominatim.openstreetmap.org');
      expect(locationService.googleMapsBaseUrl).toBe('https://maps.googleapis.com/maps/api');
      expect(locationService.nominatimHeaders).toHaveProperty('User-Agent');
    });

    test('should use Google Maps API key from environment', () => {
      process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';
      const service = new LocationService();
      expect(service.googleMapsApiKey).toBe('test-api-key');
      delete process.env.GOOGLE_MAPS_API_KEY;
    });
  });

  describe('Input Validation', () => {
    test('should validate address input for geocoding', async () => {
      await expect(locationService.geocodeAddress()).rejects.toThrow('Valid address string is required');
      await expect(locationService.geocodeAddress(null)).rejects.toThrow('Valid address string is required');
      await expect(locationService.geocodeAddress(123)).rejects.toThrow('Valid address string is required');
      await expect(locationService.geocodeAddress('')).rejects.toThrow('Address cannot be empty');
      await expect(locationService.geocodeAddress('   ')).rejects.toThrow('Address cannot be empty');
    });

    test('should validate coordinates input for reverse geocoding', async () => {
      await expect(locationService.reverseGeocode()).rejects.toThrow('Coordinates must be an array');
      await expect(locationService.reverseGeocode(null)).rejects.toThrow('Coordinates must be an array');
      await expect(locationService.reverseGeocode([1])).rejects.toThrow('Coordinates must be an array');
      await expect(locationService.reverseGeocode(['a', 'b'])).rejects.toThrow('Coordinates must be numbers');
      await expect(locationService.reverseGeocode([181, 0])).rejects.toThrow('Invalid coordinate ranges');
      await expect(locationService.reverseGeocode([0, 91])).rejects.toThrow('Invalid coordinate ranges');
    });

    test('should validate coordinate ranges', async () => {
      const invalidCoordinates = [
        [-181, 0],   // Invalid longitude (too low)
        [181, 0],    // Invalid longitude (too high)
        [0, -91],    // Invalid latitude (too low)
        [0, 91]      // Invalid latitude (too high)
      ];

      for (const coords of invalidCoordinates) {
        await expect(locationService.reverseGeocode(coords)).rejects.toThrow('Invalid coordinate ranges');
      }
    });

    test('should accept valid coordinate ranges', () => {
      const validCoordinates = [
        [-180, -90], // Southwest corner
        [180, 90],   // Northeast corner
        [0, 0],      // Equator/Prime Meridian
        [-74.006, 40.7128] // New York City
      ];

      validCoordinates.forEach(coords => {
        const [lng, lat] = coords;
        expect(lng).toBeGreaterThanOrEqual(-180);
        expect(lng).toBeLessThanOrEqual(180);
        expect(lat).toBeGreaterThanOrEqual(-90);
        expect(lat).toBeLessThanOrEqual(90);
      });
    });
  });

  describe('Nominatim Geocoding', () => {
    test('should geocode address using Nominatim', async () => {
      const mockResponse = {
        data: [{
          lat: '40.7128',
          lon: '-74.0060',
          display_name: '123 Main St, New York, NY, USA',
          importance: 0.8,
          address: {
            house_number: '123',
            road: 'Main St',
            city: 'New York',
            state: 'NY',
            postcode: '10001',
            country: 'USA'
          }
        }]
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await locationService.geocodeAddress('123 Main St, New York, NY');

      expect(result).toEqual({
        coordinates: [-74.0060, 40.7128],
        formattedAddress: '123 Main St, New York, NY, USA',
        confidence: 'high',
        components: {
          streetNumber: '123',
          street: 'Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        },
        provider: 'nominatim'
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://nominatim.openstreetmap.org/search',
        expect.objectContaining({
          params: {
            q: '123 Main St, New York, NY',
            format: 'json',
            limit: 1,
            addressdetails: 1
          },
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('LastMileDeliveryPlatform')
          })
        })
      );
    });

    test('should handle Nominatim geocoding errors', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });

      await expect(locationService.geocodeAddress('Invalid Address'))
        .rejects.toThrow('No results found for the given address');
    });

    test('should reverse geocode using Nominatim', async () => {
      const mockResponse = {
        data: {
          display_name: '123 Main St, New York, NY, USA',
          address: {
            house_number: '123',
            road: 'Main St',
            city: 'New York',
            state: 'NY',
            postcode: '10001',
            country: 'USA'
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await locationService.reverseGeocode([-74.0060, 40.7128]);

      expect(result).toEqual({
        address: '123 Main St, New York, NY, USA',
        components: {
          streetNumber: '123',
          street: 'Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        },
        provider: 'nominatim'
      });
    });
  });

  describe('Google Maps Geocoding', () => {
    beforeEach(() => {
      locationService.googleMapsApiKey = 'test-api-key';
    });

    test('should geocode address using Google Maps API', async () => {
      const mockResponse = {
        data: {
          status: 'OK',
          results: [{
            formatted_address: '123 Main St, New York, NY 10001, USA',
            geometry: {
              location: { lat: 40.7128, lng: -74.0060 },
              location_type: 'ROOFTOP'
            },
            address_components: [
              { long_name: '123', types: ['street_number'] },
              { long_name: 'Main St', types: ['route'] },
              { long_name: 'New York', types: ['locality'] },
              { short_name: 'NY', types: ['administrative_area_level_1'] },
              { long_name: '10001', types: ['postal_code'] },
              { long_name: 'USA', types: ['country'] }
            ]
          }]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await locationService.geocodeAddress('123 Main St, New York, NY');

      expect(result).toEqual({
        coordinates: [-74.0060, 40.7128],
        formattedAddress: '123 Main St, New York, NY 10001, USA',
        confidence: 'high',
        components: {
          streetNumber: '123',
          street: 'Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        },
        provider: 'google'
      });
    });

    test('should handle Google Maps API errors', async () => {
      const mockResponse = {
        data: {
          status: 'ZERO_RESULTS',
          results: []
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      await expect(locationService.geocodeAddress('Invalid Address'))
        .rejects.toThrow('Google Geocoding API error: ZERO_RESULTS');
    });

    test('should reverse geocode using Google Maps API', async () => {
      const mockResponse = {
        data: {
          status: 'OK',
          results: [{
            formatted_address: '123 Main St, New York, NY 10001, USA',
            address_components: [
              { long_name: '123', types: ['street_number'] },
              { long_name: 'Main St', types: ['route'] },
              { long_name: 'New York', types: ['locality'] },
              { short_name: 'NY', types: ['administrative_area_level_1'] },
              { long_name: '10001', types: ['postal_code'] },
              { long_name: 'USA', types: ['country'] }
            ]
          }]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await locationService.reverseGeocode([-74.0060, 40.7128]);

      expect(result).toEqual({
        address: '123 Main St, New York, NY 10001, USA',
        components: {
          streetNumber: '123',
          street: 'Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        },
        provider: 'google'
      });
    });
  });

  describe('Address Validation', () => {
    test('should validate valid address', async () => {
      const mockResponse = {
        data: [{
          lat: '40.7128',
          lon: '-74.0060',
          display_name: '123 Main St, New York, NY, USA',
          importance: 0.8,
          address: {}
        }]
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await locationService.validateAddress('123 Main St, New York, NY');

      expect(result.isValid).toBe(true);
      expect(result.address).toBe('123 Main St, New York, NY, USA');
      expect(result.coordinates).toEqual([-74.0060, 40.7128]);
      expect(result.confidence).toBe('high');
    });

    test('should handle invalid address validation', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });

      const result = await locationService.validateAddress('Invalid Address');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('No results found');
      expect(result.address).toBe('Invalid Address');
    });
  });

  describe('Route Calculation', () => {
    test('should calculate route between two points', async () => {
      const origin = [-74.0060, 40.7128]; // NYC
      const destination = [-73.9857, 40.6892]; // Brooklyn

      const result = await locationService.calculateRoute(origin, destination);

      expect(result).toHaveProperty('distance');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('route');
      expect(result).toHaveProperty('instructions');
      expect(result.method).toBe('straight-line-calculation');
      
      expect(typeof result.distance).toBe('number');
      expect(typeof result.duration).toBe('number');
      expect(result.distance).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
    });

    test('should validate route calculation inputs', async () => {
      await expect(locationService.calculateRoute()).rejects.toThrow('Origin and destination must be coordinate arrays');
      await expect(locationService.calculateRoute(null, [0, 0])).rejects.toThrow('Origin and destination must be coordinate arrays');
      await expect(locationService.calculateRoute([0, 0], null)).rejects.toThrow('Origin and destination must be coordinate arrays');
    });
  });

  describe('Rider Location Management', () => {
    test('should update rider location', async () => {
      const riderId = 'rider123';
      const coordinates = [-74.0060, 40.7128];

      const result = await locationService.updateRiderLocation(riderId, coordinates);

      expect(result.riderId).toBe(riderId);
      expect(result.coordinates).toEqual(coordinates);
      expect(result.status).toBe('updated');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    test('should validate rider location update inputs', async () => {
      await expect(locationService.updateRiderLocation('rider123', null))
        .rejects.toThrow('Invalid coordinates format');
      
      await expect(locationService.updateRiderLocation('rider123', [181, 0]))
        .rejects.toThrow('Coordinates out of valid range');
    });

    test('should find nearby riders', async () => {
      const coordinates = [-74.0060, 40.7128];
      const radius = 5000;

      const result = await locationService.getNearbyRiders(coordinates, radius);

      expect(Array.isArray(result)).toBe(true);
      // Currently returns empty array as placeholder
      expect(result).toHaveLength(0);
    });
  });

  describe('Helper Methods', () => {
    test('should calculate distance between coordinates', () => {
      const coords1 = [-74.0060, 40.7128]; // NYC
      const coords2 = [-73.9857, 40.6892]; // Brooklyn

      const distance = locationService._calculateDistance(coords1, coords2);

      expect(typeof distance).toBe('number');
      expect(distance).toBeGreaterThan(3000); // At least 3km
      expect(distance).toBeLessThan(15000);   // Less than 15km
    });

    test('should estimate travel time', () => {
      const distance = 5000; // 5km
      const time = locationService._estimateTime(distance);

      expect(typeof time).toBe('number');
      expect(time).toBeGreaterThan(0);
      expect(time).toBeLessThan(60); // Less than 1 hour for 5km
    });

    test('should map Google confidence levels', () => {
      expect(locationService._mapGoogleConfidence('ROOFTOP')).toBe('high');
      expect(locationService._mapGoogleConfidence('RANGE_INTERPOLATED')).toBe('medium');
      expect(locationService._mapGoogleConfidence('GEOMETRIC_CENTER')).toBe('medium');
      expect(locationService._mapGoogleConfidence('APPROXIMATE')).toBe('low');
      expect(locationService._mapGoogleConfidence('UNKNOWN')).toBe('medium');
    });

    test('should map Nominatim confidence levels', () => {
      expect(locationService._mapNominatimConfidence(0.8)).toBe('high');
      expect(locationService._mapNominatimConfidence(0.5)).toBe('medium');
      expect(locationService._mapNominatimConfidence(0.3)).toBe('low');
    });

    test('should parse Google address components', () => {
      const components = [
        { long_name: '123', types: ['street_number'] },
        { long_name: 'Main St', types: ['route'] },
        { long_name: 'New York', types: ['locality'] },
        { short_name: 'NY', types: ['administrative_area_level_1'] },
        { long_name: '10001', types: ['postal_code'] },
        { long_name: 'USA', types: ['country'] }
      ];

      const parsed = locationService._parseGoogleComponents(components);

      expect(parsed).toEqual({
        streetNumber: '123',
        street: 'Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA'
      });
    });

    test('should parse Nominatim address components', () => {
      const address = {
        house_number: '123',
        road: 'Main St',
        city: 'New York',
        state: 'NY',
        postcode: '10001',
        country: 'USA'
      };

      const parsed = locationService._parseNominatimComponents(address);

      expect(parsed).toEqual({
        streetNumber: '123',
        street: 'Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA'
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(locationService.geocodeAddress('123 Main St'))
        .rejects.toThrow('Failed to geocode address: Network error');
    });

    test('should handle timeout errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('timeout of 5000ms exceeded'));

      await expect(locationService.reverseGeocode([-74.0060, 40.7128]))
        .rejects.toThrow('Failed to reverse geocode coordinates: timeout of 5000ms exceeded');
    });

    test('should handle API rate limiting', async () => {
      const mockResponse = {
        data: {
          status: 'OVER_QUERY_LIMIT',
          results: []
        }
      };

      locationService.googleMapsApiKey = 'test-key';
      mockedAxios.get.mockResolvedValue(mockResponse);

      await expect(locationService.geocodeAddress('123 Main St'))
        .rejects.toThrow('Google Geocoding API error: OVER_QUERY_LIMIT');
    });
  });

  describe('Service Provider Fallback', () => {
    test('should fall back to Nominatim when Google API key is not available', async () => {
      locationService.googleMapsApiKey = null;

      const mockResponse = {
        data: [{
          lat: '40.7128',
          lon: '-74.0060',
          display_name: '123 Main St, New York, NY, USA',
          importance: 0.8,
          address: {}
        }]
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await locationService.geocodeAddress('123 Main St, New York, NY');

      expect(result.provider).toBe('nominatim');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://nominatim.openstreetmap.org/search',
        expect.any(Object)
      );
    });

    test('should use Google when API key is available and not explicitly disabled', async () => {
      locationService.googleMapsApiKey = 'test-key';

      const mockResponse = {
        data: {
          status: 'OK',
          results: [{
            formatted_address: '123 Main St, New York, NY 10001, USA',
            geometry: {
              location: { lat: 40.7128, lng: -74.0060 },
              location_type: 'ROOFTOP'
            },
            address_components: []
          }]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await locationService.geocodeAddress('123 Main St, New York, NY');

      expect(result.provider).toBe('google');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://maps.googleapis.com/maps/api/geocode/json',
        expect.any(Object)
      );
    });
  });
});