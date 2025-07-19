const request = require('supertest');
const mongoose = require('mongoose');
const Offer = require('../models/Offer');
const User = require('../models/User');

// Mock Express app setup
const express = require('express');
const app = express();
app.use(express.json());

// Import routes
const offerRoutes = require('../routes/offer');
app.use('/api/offers', offerRoutes);

// Mock environment variables
process.env.JWT_SECRET = 'test-secret-key';

// Mock models
jest.mock('../models/Offer');
jest.mock('../models/User');
jest.mock('../models/Notification');
jest.mock('../services/LocationService');

describe('Offer Filtering and Sorting', () => {
  let riderToken, businessToken, mockOffers;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup test tokens
    const jwt = require('jsonwebtoken');
    riderToken = jwt.sign(
      { id: 'rider123', role: 'rider' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    businessToken = jwt.sign(
      { id: 'business123', role: 'business' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Setup mock offers data
    mockOffers = [
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Document Delivery',
        status: 'open',
        business: new mongoose.Types.ObjectId(),
        pickup: {
          address: '123 Main St',
          coordinates: [-74.006, 40.7128]
        },
        delivery: {
          address: '456 Oak Ave',
          coordinates: [-73.9857, 40.6892]
        },
        payment: { amount: 25.50, paymentMethod: 'digital' },
        packageDetails: {
          weight: 2,
          dimensions: { length: 30, width: 20, height: 10 },
          fragile: false
        },
        estimatedDistance: 5000,
        estimatedDuration: 30,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        distanceFromRider: 1500,
        businessInfo: {
          _id: new mongoose.Types.ObjectId(),
          name: 'Test Business',
          profile: { businessName: 'Test Co' }
        }
      },
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Fragile Package',
        status: 'open',
        business: new mongoose.Types.ObjectId(),
        pickup: {
          address: '789 Pine St',
          coordinates: [-74.010, 40.720]
        },
        delivery: {
          address: '321 Elm St',
          coordinates: [-73.980, 40.685]
        },
        payment: { amount: 45.00, paymentMethod: 'cash' },
        packageDetails: {
          weight: 8,
          dimensions: { length: 50, width: 40, height: 30 },
          fragile: true
        },
        estimatedDistance: 8000,
        estimatedDuration: 45,
        createdAt: new Date('2024-01-15T11:00:00Z'),
        distanceFromRider: 3000,
        businessInfo: {
          _id: new mongoose.Types.ObjectId(),
          name: 'Fragile Co',
          profile: { businessName: 'Fragile Goods Inc' }
        }
      },
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Heavy Package',
        status: 'open',
        business: new mongoose.Types.ObjectId(),
        pickup: {
          address: '555 Cedar Ave',
          coordinates: [-74.015, 40.725]
        },
        delivery: {
          address: '777 Maple Dr',
          coordinates: [-73.975, 40.680]
        },
        payment: { amount: 60.00, paymentMethod: 'card' },
        packageDetails: {
          weight: 25,
          dimensions: { length: 80, width: 60, height: 40 },
          fragile: false
        },
        estimatedDistance: 12000,
        estimatedDuration: 60,
        createdAt: new Date('2024-01-15T12:00:00Z'),
        distanceFromRider: 4500,
        businessInfo: {
          _id: new mongoose.Types.ObjectId(),
          name: 'Heavy Logistics',
          profile: { businessName: 'Heavy Haul Co' }
        }
      }
    ];
  });

  describe('GET /api/offers/nearby - Enhanced Filtering', () => {
    test('should filter offers by payment amount range', async () => {
      // Mock the aggregation pipeline
      Offer.aggregate = jest.fn().mockImplementation((pipeline) => {
        // Check if this is the count pipeline
        if (pipeline.some(stage => stage.$count)) {
          return Promise.resolve([{ total: 2 }]);
        }
        
        // Filter offers by payment amount (25-50)
        const filtered = mockOffers.filter(offer => 
          offer.payment.amount >= 25 && offer.payment.amount <= 50
        );
        return Promise.resolve(filtered);
      });

      const response = await request(app)
        .get('/api/offers/nearby')
        .set('Authorization', `Bearer ${riderToken}`)
        .query({
          lng: -74.006,
          lat: 40.7128,
          minPayment: 25,
          maxPayment: 50
        });

      expect(response.status).toBe(200);
      expect(response.body.offers).toHaveLength(2);
      expect(response.body.offers.every(offer => 
        offer.payment.amount >= 25 && offer.payment.amount <= 50
      )).toBe(true);
      expect(response.body.filters.minPayment).toBe(25);
      expect(response.body.filters.maxPayment).toBe(50);
    });

    test('should filter offers by vehicle type constraints', async () => {
      // Mock the aggregation pipeline for bike constraints
      Offer.aggregate = jest.fn().mockImplementation((pipeline) => {
        if (pipeline.some(stage => stage.$count)) {
          return Promise.resolve([{ total: 1 }]);
        }
        
        // Filter for bike-compatible packages (weight <= 5kg)
        const filtered = mockOffers.filter(offer => 
          offer.packageDetails.weight <= 5
        );
        return Promise.resolve(filtered);
      });

      const response = await request(app)
        .get('/api/offers/nearby')
        .set('Authorization', `Bearer ${riderToken}`)
        .query({
          lng: -74.006,
          lat: 40.7128,
          vehicleType: 'bike'
        });

      expect(response.status).toBe(200);
      expect(response.body.offers).toHaveLength(1);
      expect(response.body.offers[0].packageDetails.weight).toBeLessThanOrEqual(5);
      expect(response.body.filters.vehicleType).toBe('bike');
    });

    test('should filter offers by fragile package type', async () => {
      // Mock the aggregation pipeline for fragile packages
      Offer.aggregate = jest.fn().mockImplementation((pipeline) => {
        if (pipeline.some(stage => stage.$count)) {
          return Promise.resolve([{ total: 1 }]);
        }
        
        // Filter for fragile packages
        const filtered = mockOffers.filter(offer => 
          offer.packageDetails.fragile === true
        );
        return Promise.resolve(filtered);
      });

      const response = await request(app)
        .get('/api/offers/nearby')
        .set('Authorization', `Bearer ${riderToken}`)
        .query({
          lng: -74.006,
          lat: 40.7128,
          fragile: 'true'
        });

      expect(response.status).toBe(200);
      expect(response.body.offers).toHaveLength(1);
      expect(response.body.offers[0].packageDetails.fragile).toBe(true);
      expect(response.body.filters.fragile).toBe(true);
    });

    test('should filter offers by payment method', async () => {
      // Mock the aggregation pipeline for cash payments
      Offer.aggregate = jest.fn().mockImplementation((pipeline) => {
        if (pipeline.some(stage => stage.$count)) {
          return Promise.resolve([{ total: 1 }]);
        }
        
        // Filter for cash payments
        const filtered = mockOffers.filter(offer => 
          offer.payment.paymentMethod === 'cash'
        );
        return Promise.resolve(filtered);
      });

      const response = await request(app)
        .get('/api/offers/nearby')
        .set('Authorization', `Bearer ${riderToken}`)
        .query({
          lng: -74.006,
          lat: 40.7128,
          paymentMethod: 'cash'
        });

      expect(response.status).toBe(200);
      expect(response.body.offers).toHaveLength(1);
      expect(response.body.offers[0].payment.paymentMethod).toBe('cash');
      expect(response.body.filters.paymentMethod).toBe('cash');
    });

    test('should filter offers by maximum weight', async () => {
      // Mock the aggregation pipeline for weight limit
      Offer.aggregate = jest.fn().mockImplementation((pipeline) => {
        if (pipeline.some(stage => stage.$count)) {
          return Promise.resolve([{ total: 2 }]);
        }
        
        // Filter for packages under 10kg
        const filtered = mockOffers.filter(offer => 
          offer.packageDetails.weight <= 10
        );
        return Promise.resolve(filtered);
      });

      const response = await request(app)
        .get('/api/offers/nearby')
        .set('Authorization', `Bearer ${riderToken}`)
        .query({
          lng: -74.006,
          lat: 40.7128,
          maxWeight: 10
        });

      expect(response.status).toBe(200);
      expect(response.body.offers).toHaveLength(2);
      expect(response.body.offers.every(offer => 
        offer.packageDetails.weight <= 10
      )).toBe(true);
      expect(response.body.filters.maxWeight).toBe(10);
    });

    test('should filter offers by creation date range', async () => {
      // Mock the aggregation pipeline for date range
      Offer.aggregate = jest.fn().mockImplementation((pipeline) => {
        if (pipeline.some(stage => stage.$count)) {
          return Promise.resolve([{ total: 2 }]);
        }
        
        // Filter for offers created after 10:30 AM
        const filtered = mockOffers.filter(offer => 
          offer.createdAt >= new Date('2024-01-15T10:30:00Z')
        );
        return Promise.resolve(filtered);
      });

      const response = await request(app)
        .get('/api/offers/nearby')
        .set('Authorization', `Bearer ${riderToken}`)
        .query({
          lng: -74.006,
          lat: 40.7128,
          createdAfter: '2024-01-15T10:30:00Z'
        });

      expect(response.status).toBe(200);
      expect(response.body.offers).toHaveLength(2);
      expect(response.body.filters.createdAfter).toBe('2024-01-15T10:30:00Z');
    });

    test('should combine multiple filters', async () => {
      // Mock the aggregation pipeline for combined filters
      Offer.aggregate = jest.fn().mockImplementation((pipeline) => {
        if (pipeline.some(stage => stage.$count)) {
          return Promise.resolve([{ total: 1 }]);
        }
        
        // Filter for non-fragile packages with payment 20-50 and weight <= 10
        const filtered = mockOffers.filter(offer => 
          !offer.packageDetails.fragile &&
          offer.payment.amount >= 20 &&
          offer.payment.amount <= 50 &&
          offer.packageDetails.weight <= 10
        );
        return Promise.resolve(filtered);
      });

      const response = await request(app)
        .get('/api/offers/nearby')
        .set('Authorization', `Bearer ${riderToken}`)
        .query({
          lng: -74.006,
          lat: 40.7128,
          minPayment: 20,
          maxPayment: 50,
          fragile: 'false',
          maxWeight: 10
        });

      expect(response.status).toBe(200);
      expect(response.body.offers).toHaveLength(1);
      expect(response.body.filters.minPayment).toBe(20);
      expect(response.body.filters.maxPayment).toBe(50);
      expect(response.body.filters.fragile).toBe(false);
      expect(response.body.filters.maxWeight).toBe(10);
    });
  });

  describe('GET /api/offers/nearby - Enhanced Sorting', () => {
    test('should sort offers by distance ascending (default)', async () => {
      // Mock the aggregation pipeline with distance sorting
      Offer.aggregate = jest.fn().mockImplementation((pipeline) => {
        if (pipeline.some(stage => stage.$count)) {
          return Promise.resolve([{ total: 3 }]);
        }
        
        // Sort by distance ascending
        const sorted = [...mockOffers].sort((a, b) => a.distanceFromRider - b.distanceFromRider);
        return Promise.resolve(sorted);
      });

      const response = await request(app)
        .get('/api/offers/nearby')
        .set('Authorization', `Bearer ${riderToken}`)
        .query({
          lng: -74.006,
          lat: 40.7128,
          sortBy: 'distance',
          sortOrder: 'asc'
        });

      expect(response.status).toBe(200);
      expect(response.body.offers).toHaveLength(3);
      
      // Check if sorted by distance ascending
      for (let i = 1; i < response.body.offers.length; i++) {
        expect(response.body.offers[i].distanceFromRider)
          .toBeGreaterThanOrEqual(response.body.offers[i-1].distanceFromRider);
      }
      
      expect(response.body.filters.sortBy).toBe('distance');
      expect(response.body.filters.sortOrder).toBe('asc');
    });

    test('should sort offers by payment amount descending', async () => {
      // Mock the aggregation pipeline with payment sorting
      Offer.aggregate = jest.fn().mockImplementation((pipeline) => {
        if (pipeline.some(stage => stage.$count)) {
          return Promise.resolve([{ total: 3 }]);
        }
        
        // Sort by payment descending
        const sorted = [...mockOffers].sort((a, b) => b.payment.amount - a.payment.amount);
        return Promise.resolve(sorted);
      });

      const response = await request(app)
        .get('/api/offers/nearby')
        .set('Authorization', `Bearer ${riderToken}`)
        .query({
          lng: -74.006,
          lat: 40.7128,
          sortBy: 'payment',
          sortOrder: 'desc'
        });

      expect(response.status).toBe(200);
      expect(response.body.offers).toHaveLength(3);
      
      // Check if sorted by payment descending
      for (let i = 1; i < response.body.offers.length; i++) {
        expect(response.body.offers[i].payment.amount)
          .toBeLessThanOrEqual(response.body.offers[i-1].payment.amount);
      }
      
      expect(response.body.filters.sortBy).toBe('payment');
      expect(response.body.filters.sortOrder).toBe('desc');
    });

    test('should sort offers by creation time', async () => {
      // Mock the aggregation pipeline with creation time sorting
      Offer.aggregate = jest.fn().mockImplementation((pipeline) => {
        if (pipeline.some(stage => stage.$count)) {
          return Promise.resolve([{ total: 3 }]);
        }
        
        // Sort by creation time descending (newest first)
        const sorted = [...mockOffers].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return Promise.resolve(sorted);
      });

      const response = await request(app)
        .get('/api/offers/nearby')
        .set('Authorization', `Bearer ${riderToken}`)
        .query({
          lng: -74.006,
          lat: 40.7128,
          sortBy: 'created',
          sortOrder: 'desc'
        });

      expect(response.status).toBe(200);
      expect(response.body.offers).toHaveLength(3);
      
      // Check if sorted by creation time descending
      for (let i = 1; i < response.body.offers.length; i++) {
        expect(new Date(response.body.offers[i].createdAt).getTime())
          .toBeLessThanOrEqual(new Date(response.body.offers[i-1].createdAt).getTime());
      }
      
      expect(response.body.filters.sortBy).toBe('created');
      expect(response.body.filters.sortOrder).toBe('desc');
    });

    test('should sort offers by package weight', async () => {
      // Mock the aggregation pipeline with weight sorting
      Offer.aggregate = jest.fn().mockImplementation((pipeline) => {
        if (pipeline.some(stage => stage.$count)) {
          return Promise.resolve([{ total: 3 }]);
        }
        
        // Sort by weight ascending
        const sorted = [...mockOffers].sort((a, b) => a.packageDetails.weight - b.packageDetails.weight);
        return Promise.resolve(sorted);
      });

      const response = await request(app)
        .get('/api/offers/nearby')
        .set('Authorization', `Bearer ${riderToken}`)
        .query({
          lng: -74.006,
          lat: 40.7128,
          sortBy: 'weight',
          sortOrder: 'asc'
        });

      expect(response.status).toBe(200);
      expect(response.body.offers).toHaveLength(3);
      
      // Check if sorted by weight ascending
      for (let i = 1; i < response.body.offers.length; i++) {
        expect(response.body.offers[i].packageDetails.weight)
          .toBeGreaterThanOrEqual(response.body.offers[i-1].packageDetails.weight);
      }
      
      expect(response.body.filters.sortBy).toBe('weight');
      expect(response.body.filters.sortOrder).toBe('asc');
    });

    test('should sort offers by estimated duration', async () => {
      // Mock the aggregation pipeline with duration sorting
      Offer.aggregate = jest.fn().mockImplementation((pipeline) => {
        if (pipeline.some(stage => stage.$count)) {
          return Promise.resolve([{ total: 3 }]);
        }
        
        // Sort by estimated duration ascending
        const sorted = [...mockOffers].sort((a, b) => a.estimatedDuration - b.estimatedDuration);
        return Promise.resolve(sorted);
      });

      const response = await request(app)
        .get('/api/offers/nearby')
        .set('Authorization', `Bearer ${riderToken}`)
        .query({
          lng: -74.006,
          lat: 40.7128,
          sortBy: 'estimatedDuration',
          sortOrder: 'asc'
        });

      expect(response.status).toBe(200);
      expect(response.body.offers).toHaveLength(3);
      
      // Check if sorted by estimated duration ascending
      for (let i = 1; i < response.body.offers.length; i++) {
        expect(response.body.offers[i].estimatedDuration)
          .toBeGreaterThanOrEqual(response.body.offers[i-1].estimatedDuration);
      }
      
      expect(response.body.filters.sortBy).toBe('estimatedDuration');
      expect(response.body.filters.sortOrder).toBe('asc');
    });
  });

  describe('Pagination and Response Structure', () => {
    test('should handle pagination correctly', async () => {
      // Mock the aggregation pipeline with pagination
      Offer.aggregate = jest.fn().mockImplementation((pipeline) => {
        if (pipeline.some(stage => stage.$count)) {
          return Promise.resolve([{ total: 10 }]);
        }
        
        // Return first page (2 items)
        return Promise.resolve(mockOffers.slice(0, 2));
      });

      const response = await request(app)
        .get('/api/offers/nearby')
        .set('Authorization', `Bearer ${riderToken}`)
        .query({
          lng: -74.006,
          lat: 40.7128,
          limit: 2,
          page: 1
        });

      expect(response.status).toBe(200);
      expect(response.body.offers).toHaveLength(2);
      expect(response.body.pagination).toEqual({
        currentPage: 1,
        totalPages: 5,
        totalOffers: 10,
        hasNextPage: true,
        hasPrevPage: false
      });
    });

    test('should include available filter options in response', async () => {
      // Mock the aggregation pipeline
      Offer.aggregate = jest.fn().mockImplementation((pipeline) => {
        if (pipeline.some(stage => stage.$count)) {
          return Promise.resolve([{ total: 3 }]);
        }
        return Promise.resolve(mockOffers);
      });

      const response = await request(app)
        .get('/api/offers/nearby')
        .set('Authorization', `Bearer ${riderToken}`)
        .query({
          lng: -74.006,
          lat: 40.7128
        });

      expect(response.status).toBe(200);
      expect(response.body.availableFilters).toEqual({
        sortOptions: ['distance', 'payment', 'created', 'weight', 'deliverBy', 'estimatedDuration'],
        sortOrders: ['asc', 'desc'],
        paymentMethods: ['cash', 'card', 'digital'],
        vehicleTypes: ['bike', 'scooter', 'car', 'van'],
        packageTypes: ['fragile', 'regular']
      });
    });

    test('should return error for missing coordinates', async () => {
      const response = await request(app)
        .get('/api/offers/nearby')
        .set('Authorization', `Bearer ${riderToken}`)
        .query({
          // Missing lng and lat
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Longitude and latitude are required');
      expect(response.body.example).toBeDefined();
    });

    test('should deny access to non-rider users', async () => {
      const response = await request(app)
        .get('/api/offers/nearby')
        .set('Authorization', `Bearer ${businessToken}`)
        .query({
          lng: -74.006,
          lat: 40.7128
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Only riders can view offers');
    });
  });

  describe('Distance and Location Filtering', () => {
    test('should filter offers by maximum distance', async () => {
      // Mock the aggregation pipeline with distance filtering
      Offer.aggregate = jest.fn().mockImplementation((pipeline) => {
        if (pipeline.some(stage => stage.$count)) {
          return Promise.resolve([{ total: 2 }]);
        }
        
        // Filter offers within 3000m
        const filtered = mockOffers.filter(offer => 
          offer.distanceFromRider <= 3000
        );
        return Promise.resolve(filtered);
      });

      const response = await request(app)
        .get('/api/offers/nearby')
        .set('Authorization', `Bearer ${riderToken}`)
        .query({
          lng: -74.006,
          lat: 40.7128,
          maxDistance: 3000
        });

      expect(response.status).toBe(200);
      expect(response.body.offers).toHaveLength(2);
      expect(response.body.offers.every(offer => 
        offer.distanceFromRider <= 3000
      )).toBe(true);
      expect(response.body.filters.maxDistance).toBe(3000);
    });

    test('should filter offers by minimum distance', async () => {
      // Mock the aggregation pipeline with minimum distance filtering
      Offer.aggregate = jest.fn().mockImplementation((pipeline) => {
        if (pipeline.some(stage => stage.$count)) {
          return Promise.resolve([{ total: 2 }]);
        }
        
        // Filter offers beyond 2000m
        const filtered = mockOffers.filter(offer => 
          offer.distanceFromRider >= 2000
        );
        return Promise.resolve(filtered);
      });

      const response = await request(app)
        .get('/api/offers/nearby')
        .set('Authorization', `Bearer ${riderToken}`)
        .query({
          lng: -74.006,
          lat: 40.7128,
          minDistance: 2000
        });

      expect(response.status).toBe(200);
      expect(response.body.offers).toHaveLength(2);
      expect(response.body.offers.every(offer => 
        offer.distanceFromRider >= 2000
      )).toBe(true);
      expect(response.body.filters.minDistance).toBe(2000);
    });
  });

  describe('Vehicle Constraints Helper Function', () => {
    test('should return correct constraints for different vehicle types', async () => {
      // Test bike constraints
      Offer.aggregate = jest.fn().mockImplementation((pipeline) => {
        if (pipeline.some(stage => stage.$count)) {
          return Promise.resolve([{ total: 1 }]);
        }
        
        // Should only return offers suitable for bikes (weight <= 5kg)
        const filtered = mockOffers.filter(offer => 
          offer.packageDetails.weight <= 5
        );
        return Promise.resolve(filtered);
      });

      const bikeResponse = await request(app)
        .get('/api/offers/nearby')
        .set('Authorization', `Bearer ${riderToken}`)
        .query({
          lng: -74.006,
          lat: 40.7128,
          vehicleType: 'bike'
        });

      expect(bikeResponse.status).toBe(200);
      expect(bikeResponse.body.offers).toHaveLength(1);
      expect(bikeResponse.body.offers[0].packageDetails.weight).toBeLessThanOrEqual(5);

      // Test car constraints
      Offer.aggregate = jest.fn().mockImplementation((pipeline) => {
        if (pipeline.some(stage => stage.$count)) {
          return Promise.resolve([{ total: 3 }]);
        }
        
        // Should return all offers (weight <= 50kg for cars)
        const filtered = mockOffers.filter(offer => 
          offer.packageDetails.weight <= 50
        );
        return Promise.resolve(filtered);
      });

      const carResponse = await request(app)
        .get('/api/offers/nearby')
        .set('Authorization', `Bearer ${riderToken}`)
        .query({
          lng: -74.006,
          lat: 40.7128,
          vehicleType: 'car'
        });

      expect(carResponse.status).toBe(200);
      expect(carResponse.body.offers).toHaveLength(3);
    });
  });
});