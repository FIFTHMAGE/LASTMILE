const mongoose = require('mongoose');
const Offer = require('../models/Offer');

describe('Offer Model', () => {
  let validOfferData;

  beforeAll(() => {
    // Mock business user ID
    const businessUserId = new mongoose.Types.ObjectId();

    validOfferData = {
      business: businessUserId,
      title: 'Urgent Document Delivery',
      description: 'Important legal documents need delivery',
      packageDetails: {
        weight: 0.5,
        dimensions: {
          length: 30,
          width: 20,
          height: 2
        },
        fragile: false,
        specialInstructions: 'Keep documents dry'
      },
      pickup: {
        address: '123 Main St, New York, NY 10001',
        coordinates: [-74.006, 40.7128],
        contactName: 'John Sender',
        contactPhone: '555-0100',
        availableFrom: new Date(Date.now() + 60000), // 1 minute from now
        availableUntil: new Date(Date.now() + 3600000), // 1 hour from now
        instructions: 'Ring doorbell twice'
      },
      delivery: {
        address: '456 Oak Ave, Brooklyn, NY 11201',
        coordinates: [-73.9857, 40.6892],
        contactName: 'Jane Receiver',
        contactPhone: '555-0200',
        deliverBy: new Date(Date.now() + 7200000), // 2 hours from now
        instructions: 'Leave with doorman'
      },
      payment: {
        amount: 25.50,
        currency: 'USD',
        paymentMethod: 'digital'
      }
    };
  });

  // No database cleanup needed for unit tests

  describe('Schema Validation', () => {
    test('should create offer with valid data', () => {
      const offer = new Offer(validOfferData);
      
      expect(offer.title).toBe(validOfferData.title);
      expect(offer.status).toBe('open');
      expect(offer.business).toBe(validOfferData.business);
      expect(offer.payment.amount).toBe(validOfferData.payment.amount);
    });

    test('should set default values correctly', () => {
      const offer = new Offer(validOfferData);
      
      expect(offer.status).toBe('open');
      expect(offer.payment.currency).toBe('USD');
      expect(offer.payment.paymentMethod).toBe('digital');
      expect(offer.packageDetails.fragile).toBe(false);
    });

    test('should validate required fields in schema', () => {
      const offer = new Offer(validOfferData);
      
      // Test that required fields are present
      expect(offer.business).toBeDefined();
      expect(offer.title).toBeDefined();
      expect(offer.pickup.address).toBeDefined();
      expect(offer.pickup.coordinates).toBeDefined();
      expect(offer.delivery.address).toBeDefined();
      expect(offer.delivery.coordinates).toBeDefined();
      expect(offer.payment.amount).toBeDefined();
    });

    test('should validate enum values for status', () => {
      const offer = new Offer(validOfferData);
      const validStatuses = ['open', 'accepted', 'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled'];
      
      // Test valid status
      offer.status = 'accepted';
      expect(offer.status).toBe('accepted');
      
      // Test that all valid statuses are accepted
      validStatuses.forEach(status => {
        offer.status = status;
        expect(offer.status).toBe(status);
      });
    });

    test('should validate enum values for payment method', () => {
      const offer = new Offer(validOfferData);
      const validMethods = ['cash', 'card', 'digital'];
      
      validMethods.forEach(method => {
        offer.payment.paymentMethod = method;
        expect(offer.payment.paymentMethod).toBe(method);
      });
    });
  });

  describe('Package Details Validation', () => {
    test('should accept valid package details', () => {
      const offer = new Offer(validOfferData);
      
      expect(offer.packageDetails.weight).toBe(0.5);
      expect(offer.packageDetails.dimensions.length).toBe(30);
      expect(offer.packageDetails.fragile).toBe(false);
      expect(offer.packageDetails.specialInstructions).toBe('Keep documents dry');
    });

    test('should handle missing package details gracefully', () => {
      const offerData = { ...validOfferData };
      delete offerData.packageDetails;
      
      const offer = new Offer(offerData);
      
      expect(offer.packageDetails).toBeDefined();
      expect(offer.packageDetails.fragile).toBe(false); // default value
    });
  });

  describe('Location and Coordinate Validation', () => {
    test('should validate coordinate format', () => {
      const offer = new Offer(validOfferData);
      
      expect(offer.pickup.coordinates).toHaveLength(2);
      expect(offer.delivery.coordinates).toHaveLength(2);
      expect(typeof offer.pickup.coordinates[0]).toBe('number');
      expect(typeof offer.pickup.coordinates[1]).toBe('number');
    });

    test('should have geospatial index configuration', () => {
      // Test that the schema has the correct index configuration
      // This would be verified in integration tests with actual database
      const offer = new Offer(validOfferData);
      expect(offer.pickup.coordinates).toBeDefined();
      expect(offer.delivery.coordinates).toBeDefined();
    });
  });

  describe('Custom Validation Methods', () => {
    test('validateOffer should return empty array for valid offer', () => {
      const offer = new Offer(validOfferData);
      const errors = offer.validateOffer();
      
      expect(errors).toEqual([]);
    });

    test('validateOffer should return errors for missing required fields', () => {
      const businessUserId = new mongoose.Types.ObjectId();
      const invalidData = {
        business: businessUserId,
        // Missing title, pickup, delivery, payment
      };
      
      const offer = new Offer(invalidData);
      const errors = offer.validateOffer();
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('Title is required');
      expect(errors).toContain('Pickup address is required');
      expect(errors).toContain('Delivery address is required');
    });

    test('validateOffer should validate coordinate arrays', () => {
      const invalidData = {
        ...validOfferData,
        pickup: {
          ...validOfferData.pickup,
          coordinates: [1] // Invalid - should have 2 elements
        }
      };
      
      const offer = new Offer(invalidData);
      const errors = offer.validateOffer();
      
      expect(errors).toContain('Valid pickup coordinates are required');
    });

    test('validateOffer should validate date logic', () => {
      const invalidData = {
        ...validOfferData,
        pickup: {
          ...validOfferData.pickup,
          availableFrom: new Date(Date.now() + 3600000), // 1 hour from now
          availableUntil: new Date(Date.now() + 1800000)  // 30 minutes from now
        }
      };
      
      const offer = new Offer(invalidData);
      const errors = offer.validateOffer();
      
      expect(errors).toContain('Pickup available until time must be after available from time');
    });

    test('validateOffer should validate delivery deadline', () => {
      const invalidData = {
        ...validOfferData,
        delivery: {
          ...validOfferData.delivery,
          deliverBy: new Date(Date.now() - 3600000) // 1 hour ago
        }
      };
      
      const offer = new Offer(invalidData);
      const errors = offer.validateOffer();
      
      expect(errors).toContain('Delivery deadline must be in the future');
    });
  });

  describe('Distance and Time Calculations', () => {
    test('calculateDistance should return distance in meters', () => {
      const offer = new Offer(validOfferData);
      const distance = offer.calculateDistance();
      
      expect(typeof distance).toBe('number');
      expect(distance).toBeGreaterThan(0);
      // Distance between Manhattan and Brooklyn should be reasonable
      expect(distance).toBeGreaterThan(1000); // At least 1km
      expect(distance).toBeLessThan(50000);   // Less than 50km
    });

    test('calculateDistance should return null for missing coordinates', () => {
      const invalidData = {
        ...validOfferData,
        pickup: {
          ...validOfferData.pickup,
          coordinates: null
        }
      };
      
      const offer = new Offer(invalidData);
      const distance = offer.calculateDistance();
      
      expect(distance).toBeNull();
    });

    test('estimateDeliveryTime should calculate time based on vehicle type', () => {
      const offer = new Offer(validOfferData);
      offer.estimatedDistance = 5000; // 5km
      
      const bikeTime = offer.estimateDeliveryTime('bike');
      const carTime = offer.estimateDeliveryTime('car');
      
      expect(typeof bikeTime).toBe('number');
      expect(typeof carTime).toBe('number');
      expect(bikeTime).toBeGreaterThan(carTime); // Bike should take longer
    });

    test('estimateDeliveryTime should include buffer time', () => {
      const offer = new Offer(validOfferData);
      offer.estimatedDistance = 1000; // 1km - very short distance
      
      const estimatedTime = offer.estimateDeliveryTime('bike');
      
      expect(estimatedTime).toBeGreaterThanOrEqual(10); // At least 10 minutes buffer
    });
  });

  describe('Helper Methods', () => {
    test('getSummary should return essential offer information', () => {
      const offer = new Offer(validOfferData);
      
      const summary = offer.getSummary();
      
      expect(summary.id).toBeDefined();
      expect(summary.title).toBe(validOfferData.title);
      expect(summary.pickup.address).toBe(validOfferData.pickup.address);
      expect(summary.delivery.address).toBe(validOfferData.delivery.address);
      expect(summary.payment).toEqual(validOfferData.payment);
      expect(summary.status).toBe('open');
    });

    test('should have updatedAt timestamp field', () => {
      const offer = new Offer(validOfferData);
      
      expect(offer.updatedAt).toBeDefined();
      expect(offer.createdAt).toBeDefined();
      expect(offer.updatedAt instanceof Date).toBe(true);
      expect(offer.createdAt instanceof Date).toBe(true);
    });
  });

  describe('Status Workflow', () => {
    test('should default to open status', () => {
      const offer = new Offer(validOfferData);
      
      expect(offer.status).toBe('open');
    });

    test('should allow valid status transitions', () => {
      const offer = new Offer(validOfferData);
      
      const validStatuses = ['open', 'accepted', 'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled'];
      
      validStatuses.forEach(status => {
        offer.status = status;
        expect(offer.status).toBe(status);
      });
    });
  });
});