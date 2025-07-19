/**
 * Offer Workflow Integration Tests
 * End-to-end tests for offer creation, acceptance, and completion workflows
 */

const request = require('supertest');
const app = require('../../server');
const TestFactories = global.testUtils.TestFactories;
const TestHelpers = global.testUtils.TestHelpers;

describe('Offer Workflow Integration Tests', () => {
  let business, rider, businessToken, riderToken;

  beforeEach(async () => {
    // Clean database before each test
    await TestFactories.cleanup();

    // Create test users
    business = await TestFactories.createBusinessUser();
    rider = await TestFactories.createRiderUser();
    businessToken = TestHelpers.generateToken(business);
    riderToken = TestHelpers.generateToken(rider);
  });

  describe('Complete Offer Lifecycle Workflow', () => {
    test('should complete full offer creation to delivery workflow', async () => {
      // Step 1: Business creates an offer
      const offerData = {
        packageDetails: {
          description: 'Important business documents',
          weight: 0.5,
          dimensions: {
            length: 30,
            width: 20,
            height: 2
          },
          fragile: true,
          value: 100.00
        },
        pickup: {
          address: '123 Business Plaza, Business City, BC 12345',
          coordinates: TestHelpers.generateRandomCoordinates(),
          contactName: 'John Business',
          contactPhone: business.profile.businessPhone,
          instructions: 'Ring doorbell and ask for John'
        },
        delivery: {
          address: '456 Client Street, Client City, CC 67890',
          coordinates: TestHelpers.generateRandomCoordinates(),
          contactName: 'Jane Client',
          contactPhone: '555-0199',
          instructions: 'Leave with receptionist if not available'
        },
        payment: {
          amount: 35.00,
          method: 'card'
        },
        urgency: 'urgent',
        scheduledPickup: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
      };

      const createResponse = await TestHelpers.post(app, '/api/offers', offerData, businessToken);
      const createData = TestHelpers.expectSuccessResponse(createResponse, 201);
      const offer = TestHelpers.validateOfferResponse(createData.offer);

      expect(offer.status).toBe('pending');
      expect(offer.businessId).toBe(business._id.toString());
      expect(offer.packageDetails.description).toBe(offerData.packageDetails.description);
      expect(offer.payment.amount).toBe(offerData.payment.amount);

      // Step 2: Rider searches for nearby offers
      const searchResponse = await TestHelpers.get(
        app, 
        `/api/offers/nearby?lat=${rider.profile.currentLocation.coordinates[1]}&lng=${rider.profile.currentLocation.coordinates[0]}&radius=50`, 
        riderToken
      );
      const searchData = TestHelpers.expectSuccessResponse(searchResponse, 200);
      
      expect(searchData.offers).toBeDefined();
      expect(searchData.offers.length).toBeGreaterThan(0);
      
      const foundOffer = searchData.offers.find(o => o._id === offer._id);
      expect(foundOffer).toBeDefined();

      // Step 3: Rider accepts the offer
      const acceptResponse = await TestHelpers.patch(
        app, 
        `/api/offers/${offer._id}/accept`, 
        {}, 
        riderToken
      );
      const acceptData = TestHelpers.expectSuccessResponse(acceptResponse, 200);
      
      expect(acceptData.offer.status).toBe('accepted');
      expect(acceptData.offer.riderId).toBe(rider._id.toString());

      // Step 4: Business views accepted offer
      const businessViewResponse = await TestHelpers.get(
        app, 
        `/api/offers/${offer._id}`, 
        businessToken
      );
      const businessViewData = TestHelpers.expectSuccessResponse(businessViewResponse, 200);
      
      expect(businessViewData.offer.status).toBe('accepted');
      expect(businessViewData.offer.rider).toBeDefined();
      expect(businessViewData.offer.rider.name).toBe(rider.name);

      // Step 5: Rider updates status to picked up
      const pickupResponse = await TestHelpers.patch(
        app, 
        `/api/offers/${offer._id}/status`, 
        { status: 'picked_up' }, 
        riderToken
      );
      const pickupData = TestHelpers.expectSuccessResponse(pickupResponse, 200);
      
      expect(pickupData.offer.status).toBe('picked_up');

      // Step 6: Rider updates location during transit
      const locationUpdate = {
        coordinates: TestHelpers.generateRandomCoordinates()
      };
      
      const locationResponse = await TestHelpers.post(
        app, 
        `/api/delivery/${offer._id}/location`, 
        locationUpdate, 
        riderToken
      );
      TestHelpers.expectSuccessResponse(locationResponse, 200);

      // Step 7: Rider updates status to in transit
      const transitResponse = await TestHelpers.patch(
        app, 
        `/api/offers/${offer._id}/status`, 
        { status: 'in_transit' }, 
        riderToken
      );
      const transitData = TestHelpers.expectSuccessResponse(transitResponse, 200);
      
      expect(transitData.offer.status).toBe('in_transit');

      // Step 8: Business tracks delivery progress
      const trackingResponse = await TestHelpers.get(
        app, 
        `/api/delivery/${offer._id}/tracking`, 
        businessToken
      );
      const trackingData = TestHelpers.expectSuccessResponse(trackingResponse, 200);
      
      expect(trackingData.tracking).toBeDefined();
      expect(trackingData.tracking.status).toBe('in_transit');

      // Step 9: Rider completes delivery
      const deliveryData = {
        status: 'delivered',
        deliveryProof: {
          type: 'signature',
          recipientName: 'Jane Client',
          timestamp: new Date(),
          notes: 'Delivered to receptionist as requested'
        }
      };

      const deliveryResponse = await TestHelpers.patch(
        app, 
        `/api/offers/${offer._id}/status`, 
        deliveryData, 
        riderToken
      );
      const completedData = TestHelpers.expectSuccessResponse(deliveryResponse, 200);
      
      expect(completedData.offer.status).toBe('delivered');
      expect(completedData.offer.deliveryProof).toBeDefined();

      // Step 10: Payment processing is triggered
      const paymentResponse = await TestHelpers.get(
        app, 
        `/api/payments/offer/${offer._id}`, 
        businessToken
      );
      const paymentData = TestHelpers.expectSuccessResponse(paymentResponse, 200);
      
      expect(paymentData.payment).toBeDefined();
      expect(paymentData.payment.amount).toBe(offerData.payment.amount);

      // Step 11: Business confirms delivery and rates rider
      const ratingData = {
        rating: 5,
        feedback: 'Excellent service, very professional'
      };

      const ratingResponse = await TestHelpers.post(
        app, 
        `/api/offers/${offer._id}/rate`, 
        ratingData, 
        businessToken
      );
      TestHelpers.expectSuccessResponse(ratingResponse, 200);

      // Step 12: Verify rider's stats are updated
      const riderStatsResponse = await TestHelpers.get(
        app, 
        '/api/auth/profile', 
        riderToken
      );
      const riderStatsData = TestHelpers.expectSuccessResponse(riderStatsResponse, 200);
      
      expect(riderStatsData.user.completedDeliveries).toBe(1);
      expect(riderStatsData.user.rating).toBeGreaterThanOrEqual(5.0);
    });
  });

  describe('Offer Creation and Validation Workflow', () => {
    test('should validate offer creation with all required fields', async () => {
      const validOfferData = {
        packageDetails: {
          description: 'Test package',
          weight: 2.5,
          dimensions: { length: 20, width: 15, height: 10 }
        },
        pickup: {
          address: '123 Pickup St, City, State 12345',
          coordinates: [-122.4194, 37.7749],
          contactName: 'Pickup Contact',
          contactPhone: '555-0111'
        },
        delivery: {
          address: '456 Delivery Ave, City, State 67890',
          coordinates: [-122.4094, 37.7849],
          contactName: 'Delivery Contact',
          contactPhone: '555-0222'
        },
        payment: { amount: 25.00, method: 'card' }
      };

      const response = await TestHelpers.post(app, '/api/offers', validOfferData, businessToken);
      const data = TestHelpers.expectSuccessResponse(response, 201);
      
      TestHelpers.validateOfferResponse(data.offer);
    });

    test('should reject offer creation with missing required fields', async () => {
      const incompleteOfferData = {
        packageDetails: {
          description: 'Test package'
          // Missing weight and dimensions
        },
        pickup: {
          address: '123 Pickup St'
          // Missing coordinates and contact info
        }
        // Missing delivery and payment
      };

      const response = await TestHelpers.post(app, '/api/offers', incompleteOfferData, businessToken);
      TestHelpers.expectValidationError(response);
    });

    test('should validate geospatial coordinates', async () => {
      const invalidCoordinatesData = {
        packageDetails: {
          description: 'Test package',
          weight: 1.0,
          dimensions: { length: 10, width: 10, height: 10 }
        },
        pickup: {
          address: '123 Pickup St',
          coordinates: [200, 100], // Invalid coordinates (out of range)
          contactName: 'Contact',
          contactPhone: '555-0111'
        },
        delivery: {
          address: '456 Delivery Ave',
          coordinates: [-122.4094, 37.7849],
          contactName: 'Contact',
          contactPhone: '555-0222'
        },
        payment: { amount: 25.00, method: 'card' }
      };

      const response = await TestHelpers.post(app, '/api/offers', invalidCoordinatesData, businessToken);
      TestHelpers.expectValidationError(response);
    });
  });

  describe('Offer Search and Filtering Workflow', () => {
    beforeEach(async () => {
      // Create multiple offers with different characteristics
      const offers = [
        {
          packageDetails: { description: 'Small package', weight: 0.5, dimensions: { length: 10, width: 10, height: 5 } },
          pickup: { address: 'Downtown pickup', coordinates: [-122.4194, 37.7749], contactName: 'Contact', contactPhone: '555-0111' },
          delivery: { address: 'Downtown delivery', coordinates: [-122.4094, 37.7849], contactName: 'Contact', contactPhone: '555-0222' },
          payment: { amount: 15.00, method: 'card' },
          urgency: 'standard'
        },
        {
          packageDetails: { description: 'Large package', weight: 5.0, dimensions: { length: 50, width: 30, height: 20 } },
          pickup: { address: 'Uptown pickup', coordinates: [-122.4294, 37.7849], contactName: 'Contact', contactPhone: '555-0111' },
          delivery: { address: 'Uptown delivery', coordinates: [-122.4194, 37.7949], contactName: 'Contact', contactPhone: '555-0222' },
          payment: { amount: 45.00, method: 'card' },
          urgency: 'urgent'
        },
        {
          packageDetails: { description: 'Medium package', weight: 2.0, dimensions: { length: 25, width: 20, height: 15 } },
          pickup: { address: 'Midtown pickup', coordinates: [-122.4144, 37.7799], contactName: 'Contact', contactPhone: '555-0111' },
          delivery: { address: 'Midtown delivery', coordinates: [-122.4044, 37.7899], contactName: 'Contact', contactPhone: '555-0222' },
          payment: { amount: 30.00, method: 'cash' },
          urgency: 'standard'
        }
      ];

      for (const offerData of offers) {
        await TestHelpers.post(app, '/api/offers', offerData, businessToken);
      }
    });

    test('should filter offers by distance', async () => {
      const response = await TestHelpers.get(
        app, 
        '/api/offers/nearby?lat=37.7749&lng=-122.4194&radius=5', 
        riderToken
      );
      const data = TestHelpers.expectSuccessResponse(response, 200);
      
      expect(data.offers).toBeDefined();
      expect(data.offers.length).toBeGreaterThan(0);
      
      // All offers should be within the specified radius
      data.offers.forEach(offer => {
        expect(offer.distance).toBeLessThanOrEqual(5);
      });
    });

    test('should filter offers by payment amount', async () => {
      const response = await TestHelpers.get(
        app, 
        '/api/offers?minAmount=20&maxAmount=40', 
        riderToken
      );
      const data = TestHelpers.expectSuccessResponse(response, 200);
      
      expect(data.offers).toBeDefined();
      data.offers.forEach(offer => {
        expect(offer.payment.amount).toBeGreaterThanOrEqual(20);
        expect(offer.payment.amount).toBeLessThanOrEqual(40);
      });
    });

    test('should filter offers by urgency', async () => {
      const response = await TestHelpers.get(
        app, 
        '/api/offers?urgency=urgent', 
        riderToken
      );
      const data = TestHelpers.expectSuccessResponse(response, 200);
      
      expect(data.offers).toBeDefined();
      data.offers.forEach(offer => {
        expect(offer.urgency).toBe('urgent');
      });
    });

    test('should sort offers by payment amount', async () => {
      const response = await TestHelpers.get(
        app, 
        '/api/offers?sortBy=payment&sortOrder=desc', 
        riderToken
      );
      const data = TestHelpers.expectSuccessResponse(response, 200);
      
      expect(data.offers).toBeDefined();
      if (data.offers.length > 1) {
        for (let i = 1; i < data.offers.length; i++) {
          expect(data.offers[i-1].payment.amount).toBeGreaterThanOrEqual(data.offers[i].payment.amount);
        }
      }
    });
  });

  describe('Offer Status Management Workflow', () => {
    let offer;

    beforeEach(async () => {
      // Create a test offer
      const offerData = {
        packageDetails: { description: 'Status test package', weight: 1.0, dimensions: { length: 15, width: 15, height: 10 } },
        pickup: { address: 'Status pickup', coordinates: [-122.4194, 37.7749], contactName: 'Contact', contactPhone: '555-0111' },
        delivery: { address: 'Status delivery', coordinates: [-122.4094, 37.7849], contactName: 'Contact', contactPhone: '555-0222' },
        payment: { amount: 25.00, method: 'card' }
      };

      const response = await TestHelpers.post(app, '/api/offers', offerData, businessToken);
      const data = TestHelpers.expectSuccessResponse(response, 201);
      offer = data.offer;
    });

    test('should enforce valid status transitions', async () => {
      // Accept offer first
      await TestHelpers.patch(app, `/api/offers/${offer._id}/accept`, {}, riderToken);

      // Valid transition: accepted -> picked_up
      const pickupResponse = await TestHelpers.patch(
        app, 
        `/api/offers/${offer._id}/status`, 
        { status: 'picked_up' }, 
        riderToken
      );
      TestHelpers.expectSuccessResponse(pickupResponse, 200);

      // Valid transition: picked_up -> in_transit
      const transitResponse = await TestHelpers.patch(
        app, 
        `/api/offers/${offer._id}/status`, 
        { status: 'in_transit' }, 
        riderToken
      );
      TestHelpers.expectSuccessResponse(transitResponse, 200);

      // Valid transition: in_transit -> delivered
      const deliveredResponse = await TestHelpers.patch(
        app, 
        `/api/offers/${offer._id}/status`, 
        { status: 'delivered' }, 
        riderToken
      );
      TestHelpers.expectSuccessResponse(deliveredResponse, 200);
    });

    test('should reject invalid status transitions', async () => {
      // Try to go directly from pending to delivered (invalid)
      const response = await TestHelpers.patch(
        app, 
        `/api/offers/${offer._id}/status`, 
        { status: 'delivered' }, 
        riderToken
      );
      TestHelpers.expectValidationError(response);
    });

    test('should prevent unauthorized status updates', async () => {
      // Accept offer with rider
      await TestHelpers.patch(app, `/api/offers/${offer._id}/accept`, {}, riderToken);

      // Create another rider and try to update status
      const otherRider = await TestFactories.createRiderUser();
      const otherRiderToken = TestHelpers.generateToken(otherRider);

      const response = await TestHelpers.patch(
        app, 
        `/api/offers/${offer._id}/status`, 
        { status: 'picked_up' }, 
        otherRiderToken
      );
      TestHelpers.expectAuthorizationError(response);
    });
  });

  describe('Offer Cancellation Workflow', () => {
    test('should allow business to cancel pending offer', async () => {
      // Create offer
      const offerData = {
        packageDetails: { description: 'Cancellation test', weight: 1.0, dimensions: { length: 10, width: 10, height: 10 } },
        pickup: { address: 'Cancel pickup', coordinates: [-122.4194, 37.7749], contactName: 'Contact', contactPhone: '555-0111' },
        delivery: { address: 'Cancel delivery', coordinates: [-122.4094, 37.7849], contactName: 'Contact', contactPhone: '555-0222' },
        payment: { amount: 20.00, method: 'card' }
      };

      const createResponse = await TestHelpers.post(app, '/api/offers', offerData, businessToken);
      const createData = TestHelpers.expectSuccessResponse(createResponse, 201);
      const offer = createData.offer;

      // Cancel offer
      const cancelResponse = await TestHelpers.patch(
        app, 
        `/api/offers/${offer._id}/cancel`, 
        { reason: 'No longer needed' }, 
        businessToken
      );
      const cancelData = TestHelpers.expectSuccessResponse(cancelResponse, 200);
      
      expect(cancelData.offer.status).toBe('cancelled');
    });

    test('should prevent cancellation of accepted offers without penalty', async () => {
      // Create and accept offer
      const offerData = {
        packageDetails: { description: 'Accept then cancel test', weight: 1.0, dimensions: { length: 10, width: 10, height: 10 } },
        pickup: { address: 'Test pickup', coordinates: [-122.4194, 37.7749], contactName: 'Contact', contactPhone: '555-0111' },
        delivery: { address: 'Test delivery', coordinates: [-122.4094, 37.7849], contactName: 'Contact', contactPhone: '555-0222' },
        payment: { amount: 25.00, method: 'card' }
      };

      const createResponse = await TestHelpers.post(app, '/api/offers', offerData, businessToken);
      const createData = TestHelpers.expectSuccessResponse(createResponse, 201);
      const offer = createData.offer;

      // Accept offer
      await TestHelpers.patch(app, `/api/offers/${offer._id}/accept`, {}, riderToken);

      // Try to cancel accepted offer
      const cancelResponse = await TestHelpers.patch(
        app, 
        `/api/offers/${offer._id}/cancel`, 
        { reason: 'Changed mind' }, 
        businessToken
      );
      
      // This might return success but with penalty information,
      // or it might require additional confirmation
      const cancelData = TestHelpers.expectSuccessResponse(cancelResponse, 200);
      expect(cancelData.penalty || cancelData.warning).toBeDefined();
    });
  });

  describe('Offer Performance and Load Testing', () => {
    test('should handle concurrent offer creation', async () => {
      const offerData = {
        packageDetails: { description: 'Concurrent test', weight: 1.0, dimensions: { length: 10, width: 10, height: 10 } },
        pickup: { address: 'Concurrent pickup', coordinates: [-122.4194, 37.7749], contactName: 'Contact', contactPhone: '555-0111' },
        delivery: { address: 'Concurrent delivery', coordinates: [-122.4094, 37.7849], contactName: 'Contact', contactPhone: '555-0222' },
        payment: { amount: 25.00, method: 'card' }
      };

      const createOffer = () => TestHelpers.post(app, '/api/offers', offerData, businessToken);
      
      const results = await TestHelpers.loadTest(createOffer, 5, 10);
      
      expect(results.successfulRequests).toBeGreaterThan(0);
      expect(results.failedRequests).toBe(0);
      expect(results.averageTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle concurrent offer acceptance', async () => {
      // Create offer
      const offerData = {
        packageDetails: { description: 'Acceptance race test', weight: 1.0, dimensions: { length: 10, width: 10, height: 10 } },
        pickup: { address: 'Race pickup', coordinates: [-122.4194, 37.7749], contactName: 'Contact', contactPhone: '555-0111' },
        delivery: { address: 'Race delivery', coordinates: [-122.4094, 37.7849], contactName: 'Contact', contactPhone: '555-0222' },
        payment: { amount: 30.00, method: 'card' }
      };

      const createResponse = await TestHelpers.post(app, '/api/offers', offerData, businessToken);
      const createData = TestHelpers.expectSuccessResponse(createResponse, 201);
      const offer = createData.offer;

      // Create multiple riders
      const riders = await TestFactories.createUsers(3, 'rider');
      const riderTokens = riders.map(r => TestHelpers.generateToken(r));

      // All riders try to accept the same offer simultaneously
      const acceptPromises = riderTokens.map(token => 
        TestHelpers.patch(app, `/api/offers/${offer._id}/accept`, {}, token)
      );

      const results = await Promise.allSettled(acceptPromises);
      
      // Only one should succeed, others should fail
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      const failed = results.filter(r => r.status === 'fulfilled' && r.value.status !== 200);
      
      expect(successful.length).toBe(1);
      expect(failed.length).toBe(2);
    });
  });
});