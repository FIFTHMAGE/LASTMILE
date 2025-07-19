const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const deliveryRoutes = require('../routes/delivery');
const DeliveryTracking = require('../models/DeliveryTracking');
const Offer = require('../models/Offer');
const NotificationService = require('../services/NotificationService');
const auth = require('../middleware/auth');

// Mock dependencies
jest.mock('../models/DeliveryTracking');
jest.mock('../models/Offer');
jest.mock('../services/NotificationService');
jest.mock('../middleware/auth');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/delivery', deliveryRoutes);

describe('Delivery Tracking Endpoints', () => {
  let mockUser, mockOffer, mockTracking;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock user data
    mockUser = {
      id: new mongoose.Types.ObjectId().toString(),
      role: 'rider',
      email: 'rider@test.com'
    };

    // Mock offer data
    mockOffer = {
      _id: new mongoose.Types.ObjectId(),
      business: new mongoose.Types.ObjectId(),
      acceptedBy: new mongoose.Types.ObjectId(mockUser.id),
      status: 'accepted',
      title: 'Test Delivery',
      save: jest.fn().mockResolvedValue(true)
    };

    // Mock tracking data
    mockTracking = {
      _id: new mongoose.Types.ObjectId(),
      offer: mockOffer._id,
      rider: new mongoose.Types.ObjectId(mockUser.id),
      business: mockOffer.business,
      currentStatus: 'accepted',
      save: jest.fn().mockResolvedValue(true),
      getSummary: jest.fn().mockReturnValue({
        id: 'tracking_id',
        currentStatus: 'accepted',
        progressPercentage: 0
      }),
      getDetailedTracking: jest.fn().mockReturnValue({
        id: 'tracking_id',
        currentStatus: 'accepted',
        events: [],
        locationHistory: []
      }),
      updateStatus: jest.fn().mockResolvedValue(true),
      updateLocation: jest.fn().mockResolvedValue(true),
      reportIssue: jest.fn().mockResolvedValue(true),
      confirmDelivery: jest.fn().mockResolvedValue(true),
      updateEstimatedDelivery: jest.fn().mockResolvedValue(true),
      currentLocation: {
        coordinates: [-74.006, 40.7128],
        lastUpdated: new Date()
      },
      estimatedDelivery: {
        estimatedTime: new Date(Date.now() + 30 * 60 * 1000),
        estimatedDuration: 30
      },
      estimatedTimeRemaining: 30,
      deliveryConfirmation: {
        confirmationType: 'photo',
        confirmedAt: new Date()
      },
      issues: []
    };

    // Mock auth middleware
    auth.mockImplementation((req, res, next) => {
      req.user = mockUser;
      next();
    });

    // Mock NotificationService
    NotificationService.mockImplementation(() => ({
      send: jest.fn().mockResolvedValue(true),
      sendOfferNotification: jest.fn().mockResolvedValue(true)
    }));
  });

  describe('POST /api/delivery/tracking', () => {
    test('should create delivery tracking successfully', async () => {
      Offer.findById = jest.fn().mockResolvedValue(mockOffer);
      DeliveryTracking.findOne = jest.fn().mockResolvedValue(null);
      DeliveryTracking.createForOffer = jest.fn().mockResolvedValue(mockTracking);

      const response = await request(app)
        .post('/api/delivery/tracking')
        .send({
          offerId: mockOffer._id,
          initialLocation: {
            coordinates: [-74.006, 40.7128],
            address: '123 Main St'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tracking).toBeDefined();
      expect(DeliveryTracking.createForOffer).toHaveBeenCalledWith(
        mockOffer._id,
        mockUser.id,
        mockOffer.business,
        expect.any(Object)
      );
    });

    test('should reject non-rider users', async () => {
      mockUser.role = 'business';

      const response = await request(app)
        .post('/api/delivery/tracking')
        .send({ offerId: mockOffer._id });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Only riders can create delivery tracking');
    });

    test('should require offer ID', async () => {
      const response = await request(app)
        .post('/api/delivery/tracking')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Offer ID is required');
    });

    test('should reject if offer not found', async () => {
      Offer.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .post('/api/delivery/tracking')
        .send({ offerId: mockOffer._id });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Offer not found');
    });

    test('should reject if tracking already exists', async () => {
      Offer.findById = jest.fn().mockResolvedValue(mockOffer);
      DeliveryTracking.findOne = jest.fn().mockResolvedValue(mockTracking);

      const response = await request(app)
        .post('/api/delivery/tracking')
        .send({ offerId: mockOffer._id });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Delivery tracking already exists for this offer');
    });
  });

  describe('PUT /api/delivery/:trackingId/status', () => {
    test('should update delivery status successfully', async () => {
      DeliveryTracking.findById = jest.fn().mockResolvedValue(mockTracking);
      Offer.findById = jest.fn().mockResolvedValue(mockOffer);

      const response = await request(app)
        .put(`/api/delivery/${mockTracking._id}/status`)
        .send({
          status: 'picked_up',
          description: 'Package picked up from sender',
          location: {
            coordinates: [-74.006, 40.7128],
            address: '123 Main St'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockTracking.updateStatus).toHaveBeenCalledWith('picked_up', {
        location: expect.any(Object),
        description: 'Package picked up from sender',
        reportedBy: mockUser.id,
        metadata: {}
      });
    });

    test('should reject non-rider users', async () => {
      mockUser.role = 'business';

      const response = await request(app)
        .put(`/api/delivery/${mockTracking._id}/status`)
        .send({ status: 'picked_up' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Only riders can update delivery status');
    });

    test('should require status field', async () => {
      const response = await request(app)
        .put(`/api/delivery/${mockTracking._id}/status`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Status is required');
    });

    test('should handle invalid status transitions', async () => {
      DeliveryTracking.findById = jest.fn().mockResolvedValue(mockTracking);
      mockTracking.updateStatus.mockRejectedValue(new Error('Invalid status transition from accepted to completed'));

      const response = await request(app)
        .put(`/api/delivery/${mockTracking._id}/status`)
        .send({ status: 'completed' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid status transition from accepted to completed');
    });
  });

  describe('PUT /api/delivery/:trackingId/location', () => {
    test('should update location successfully', async () => {
      DeliveryTracking.findById = jest.fn().mockResolvedValue(mockTracking);

      const response = await request(app)
        .put(`/api/delivery/${mockTracking._id}/location`)
        .send({
          coordinates: [-74.007, 40.7129],
          address: '124 Main St',
          accuracy: 5,
          speed: 25,
          heading: 90
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockTracking.updateLocation).toHaveBeenCalledWith(
        [-74.007, 40.7129],
        {
          address: '124 Main St',
          accuracy: 5,
          speed: 25,
          heading: 90
        }
      );
    });

    test('should require valid coordinates', async () => {
      const response = await request(app)
        .put(`/api/delivery/${mockTracking._id}/location`)
        .send({ coordinates: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Valid coordinates [longitude, latitude] are required');
    });

    test('should reject access for non-owner', async () => {
      mockTracking.rider = new mongoose.Types.ObjectId(); // Different rider
      DeliveryTracking.findById = jest.fn().mockResolvedValue(mockTracking);

      const response = await request(app)
        .put(`/api/delivery/${mockTracking._id}/location`)
        .send({ coordinates: [-74.007, 40.7129] });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('You can only update location for your own deliveries');
    });
  });

  describe('POST /api/delivery/:trackingId/issues', () => {
    test('should report issue successfully', async () => {
      DeliveryTracking.findById = jest.fn().mockResolvedValue(mockTracking);
      mockTracking.issues = [{ type: 'package_damaged', description: 'Box is wet' }];

      const response = await request(app)
        .post(`/api/delivery/${mockTracking._id}/issues`)
        .send({
          type: 'package_damaged',
          description: 'Package appears to be damaged',
          severity: 'high',
          location: {
            coordinates: [-74.006, 40.7128],
            address: '123 Main St'
          },
          photos: ['photo1.jpg']
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(mockTracking.reportIssue).toHaveBeenCalledWith({
        type: 'package_damaged',
        description: 'Package appears to be damaged',
        reportedBy: mockUser.id,
        location: expect.any(Object),
        severity: 'high',
        photos: ['photo1.jpg']
      });
    });

    test('should require type and description', async () => {
      const response = await request(app)
        .post(`/api/delivery/${mockTracking._id}/issues`)
        .send({ type: 'package_damaged' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Issue type and description are required');
    });
  });

  describe('POST /api/delivery/:trackingId/confirm', () => {
    test('should confirm delivery successfully', async () => {
      DeliveryTracking.findById = jest.fn().mockResolvedValue(mockTracking);

      const response = await request(app)
        .post(`/api/delivery/${mockTracking._id}/confirm`)
        .send({
          confirmationType: 'photo',
          confirmationData: {
            photoUrl: 'delivery-photo.jpg',
            recipientName: 'John Doe'
          },
          deliveryLocation: {
            coordinates: [-74.006, 40.7128],
            address: '123 Main St'
          },
          notes: 'Left at front door'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockTracking.confirmDelivery).toHaveBeenCalledWith({
        confirmationType: 'photo',
        confirmationData: expect.any(Object),
        deliveryLocation: expect.any(Object),
        notes: 'Left at front door'
      });
    });

    test('should require confirmation type', async () => {
      const response = await request(app)
        .post(`/api/delivery/${mockTracking._id}/confirm`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Confirmation type is required');
    });
  });

  describe('GET /api/delivery/:trackingId', () => {
    test('should get delivery tracking details', async () => {
      const populatedTracking = {
        ...mockTracking,
        offer: { title: 'Test Delivery' },
        rider: { name: 'John Rider' },
        business: { businessName: 'Test Business' }
      };

      DeliveryTracking.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(populatedTracking)
          })
        })
      });

      const response = await request(app)
        .get(`/api/delivery/${mockTracking._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tracking).toBeDefined();
      expect(response.body.data.offer).toBeDefined();
      expect(response.body.data.rider).toBeDefined();
      expect(response.body.data.business).toBeDefined();
    });

    test('should get detailed tracking when requested', async () => {
      const populatedTracking = {
        ...mockTracking,
        offer: { title: 'Test Delivery' },
        rider: { name: 'John Rider' },
        business: { businessName: 'Test Business' }
      };

      DeliveryTracking.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(populatedTracking)
          })
        })
      });

      const response = await request(app)
        .get(`/api/delivery/${mockTracking._id}?detailed=true`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockTracking.getDetailedTracking).toHaveBeenCalled();
    });

    test('should reject access for unauthorized users', async () => {
      mockTracking.rider = new mongoose.Types.ObjectId();
      mockTracking.business = new mongoose.Types.ObjectId();
      
      const populatedTracking = {
        ...mockTracking,
        rider: { _id: mockTracking.rider },
        business: { _id: mockTracking.business }
      };

      DeliveryTracking.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(populatedTracking)
          })
        })
      });

      const response = await request(app)
        .get(`/api/delivery/${mockTracking._id}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied');
    });
  });

  describe('GET /api/delivery/offer/:offerId', () => {
    test('should get tracking by offer ID', async () => {
      const populatedTracking = {
        ...mockTracking,
        offer: { title: 'Test Delivery' },
        rider: { _id: new mongoose.Types.ObjectId(mockUser.id), name: 'John Rider' },
        business: { _id: mockOffer.business, businessName: 'Test Business' }
      };

      DeliveryTracking.getByOfferId = jest.fn().mockResolvedValue(populatedTracking);

      const response = await request(app)
        .get(`/api/delivery/offer/${mockOffer._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tracking).toBeDefined();
      expect(DeliveryTracking.getByOfferId).toHaveBeenCalledWith(mockOffer._id);
    });

    test('should return 404 if tracking not found', async () => {
      DeliveryTracking.getByOfferId = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/delivery/offer/${mockOffer._id}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Delivery tracking not found for this offer');
    });
  });

  describe('GET /api/delivery/rider/active', () => {
    test('should get active deliveries for rider', async () => {
      const activeDeliveries = [
        {
          ...mockTracking,
          offer: { title: 'Delivery 1' },
          business: { businessName: 'Business 1' }
        },
        {
          ...mockTracking,
          offer: { title: 'Delivery 2' },
          business: { businessName: 'Business 2' }
        }
      ];

      DeliveryTracking.getActiveDeliveries = jest.fn().mockResolvedValue(activeDeliveries);

      const response = await request(app)
        .get('/api/delivery/rider/active');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.activeDeliveries).toHaveLength(2);
      expect(response.body.data.count).toBe(2);
      expect(DeliveryTracking.getActiveDeliveries).toHaveBeenCalledWith(mockUser.id);
    });

    test('should reject non-rider users', async () => {
      mockUser.role = 'business';

      const response = await request(app)
        .get('/api/delivery/rider/active');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Only riders can access active deliveries');
    });
  });

  describe('GET /api/delivery/business/deliveries', () => {
    test('should get deliveries for business', async () => {
      mockUser.role = 'business';
      
      const businessDeliveries = [
        {
          ...mockTracking,
          offer: { title: 'Delivery 1' },
          rider: { name: 'Rider 1' }
        }
      ];

      DeliveryTracking.getBusinessDeliveries = jest.fn().mockResolvedValue(businessDeliveries);

      const response = await request(app)
        .get('/api/delivery/business/deliveries?status=in_transit&page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.deliveries).toHaveLength(1);
      expect(DeliveryTracking.getBusinessDeliveries).toHaveBeenCalledWith(
        mockUser.id,
        {
          status: 'in_transit',
          limit: 10,
          skip: 0
        }
      );
    });

    test('should reject non-business users', async () => {
      const response = await request(app)
        .get('/api/delivery/business/deliveries');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Only businesses can access delivery list');
    });
  });

  describe('PUT /api/delivery/:trackingId/estimate', () => {
    test('should update delivery estimate', async () => {
      DeliveryTracking.findById = jest.fn().mockResolvedValue(mockTracking);

      const response = await request(app)
        .put(`/api/delivery/${mockTracking._id}/estimate`)
        .send({
          distance: 10,
          traffic: 'heavy',
          weather: 'rain',
          timeOfDay: 'rush_hour'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockTracking.updateEstimatedDelivery).toHaveBeenCalledWith({
        distance: 10,
        traffic: 'heavy',
        weather: 'rain',
        timeOfDay: 'rush_hour'
      });
    });
  });

  describe('GET /api/delivery/stats', () => {
    test('should get delivery statistics for rider', async () => {
      const mockStats = {
        totalDeliveries: 25,
        statusBreakdown: { completed: 20, in_transit: 3, cancelled: 2 },
        completionRate: 80,
        averageDuration: 45,
        averageDistance: 5.5
      };

      DeliveryTracking.getDeliveryStats = jest.fn().mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/delivery/stats?startDate=2024-01-01&endDate=2024-01-31');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toEqual(mockStats);
      expect(DeliveryTracking.getDeliveryStats).toHaveBeenCalledWith({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        riderId: mockUser.id
      });
    });

    test('should get delivery statistics for business', async () => {
      mockUser.role = 'business';
      
      const mockStats = {
        totalDeliveries: 15,
        statusBreakdown: { completed: 12, in_transit: 2, cancelled: 1 },
        completionRate: 80,
        averageDuration: 40,
        averageDistance: 4.2
      };

      DeliveryTracking.getDeliveryStats = jest.fn().mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/delivery/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(DeliveryTracking.getDeliveryStats).toHaveBeenCalledWith({
        startDate: undefined,
        endDate: undefined,
        businessId: mockUser.id
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      DeliveryTracking.findById = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get(`/api/delivery/${mockTracking._id}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to retrieve delivery tracking');
    });

    test('should handle missing tracking gracefully', async () => {
      DeliveryTracking.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .put(`/api/delivery/nonexistent/status`)
        .send({ status: 'picked_up' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Delivery tracking not found');
    });
  });
});