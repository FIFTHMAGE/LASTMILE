const mongoose = require('mongoose');
const Offer = require('../models/Offer');
const User = require('../models/User');

describe('Offer Status Update Endpoints', () => {
  let businessUser, riderUser, testOffer;

  beforeAll(() => {
    // Mock user IDs
    businessUser = new mongoose.Types.ObjectId();
    riderUser = new mongoose.Types.ObjectId();
  });

  beforeEach(() => {
    // Create a fresh test offer for each test
    testOffer = new Offer({
      business: businessUser,
      title: 'Test Delivery',
      pickup: {
        address: '123 Main St, New York, NY',
        coordinates: [-74.006, 40.7128],
        contactName: 'John Doe',
        contactPhone: '555-0001'
      },
      delivery: {
        address: '456 Oak Ave, Brooklyn, NY',
        coordinates: [-73.9857, 40.6892],
        contactName: 'Jane Smith',
        contactPhone: '555-0002'
      },
      payment: { amount: 25.50 }
    });
  });

  describe('Status Update Workflow', () => {
    test('should support complete delivery workflow', () => {
      // Initial state
      expect(testOffer.status).toBe('open');
      
      // Rider accepts offer
      testOffer.updateStatus('accepted', riderUser, { notes: 'I can deliver this' });
      expect(testOffer.status).toBe('accepted');
      expect(testOffer.acceptedBy).toEqual(riderUser);
      expect(testOffer.acceptedAt).toBeInstanceOf(Date);
      
      // Rider picks up package
      testOffer.updateStatus('picked_up', riderUser, { notes: 'Package collected' });
      expect(testOffer.status).toBe('picked_up');
      expect(testOffer.pickedUpAt).toBeInstanceOf(Date);
      
      // Rider starts delivery
      testOffer.updateStatus('in_transit', riderUser, { notes: 'On the way' });
      expect(testOffer.status).toBe('in_transit');
      expect(testOffer.inTransitAt).toBeInstanceOf(Date);
      
      // Rider delivers package
      testOffer.updateStatus('delivered', riderUser, { notes: 'Package delivered' });
      expect(testOffer.status).toBe('delivered');
      expect(testOffer.deliveredAt).toBeInstanceOf(Date);
      
      // Business confirms completion
      testOffer.updateStatus('completed', businessUser, { notes: 'Delivery confirmed' });
      expect(testOffer.status).toBe('completed');
      expect(testOffer.completedAt).toBeInstanceOf(Date);
      
      // Verify status history
      expect(testOffer.statusHistory.length).toBeGreaterThanOrEqual(5);
    });

    test('should support cancellation workflow', () => {
      // Business cancels open offer
      testOffer.updateStatus('cancelled', businessUser, { notes: 'No longer needed' });
      expect(testOffer.status).toBe('cancelled');
      expect(testOffer.cancelledAt).toBeInstanceOf(Date);
      
      // Verify terminal state
      const statusInfo = testOffer.getCurrentStatusInfo();
      expect(statusInfo.isTerminal).toBe(true);
      expect(statusInfo.validNextStates).toEqual([]);
    });

    test('should support rider cancellation after acceptance', () => {
      // Accept first
      testOffer.updateStatus('accepted', riderUser);
      expect(testOffer.status).toBe('accepted');
      
      // Rider cancels
      testOffer.updateStatus('cancelled', riderUser, { notes: 'Unable to complete' });
      expect(testOffer.status).toBe('cancelled');
      expect(testOffer.cancelledAt).toBeInstanceOf(Date);
    });
  });

  describe('Status Validation', () => {
    test('should validate role-based permissions', () => {
      // Only riders can accept offers
      expect(() => {
        testOffer.updateStatus('accepted', businessUser);
      }).toThrow('Only riders can accept offers');
      
      // Accept offer first
      testOffer.updateStatus('accepted', riderUser);
      
      // Only assigned rider can update delivery status
      const anotherRider = new mongoose.Types.ObjectId();
      expect(() => {
        testOffer.updateStatus('picked_up', anotherRider);
      }).toThrow('Only the assigned rider can update this status');
      
      // Assigned rider can update
      expect(() => {
        testOffer.updateStatus('picked_up', riderUser);
      }).not.toThrow();
    });

    test('should validate status transitions', () => {
      // Cannot skip steps
      expect(() => {
        testOffer.updateStatus('picked_up', riderUser);
      }).toThrow('Invalid status transition');
      
      expect(() => {
        testOffer.updateStatus('delivered', riderUser);
      }).toThrow('Invalid status transition');
      
      // Must follow proper sequence
      testOffer.updateStatus('accepted', riderUser);
      expect(() => {
        testOffer.updateStatus('delivered', riderUser);
      }).toThrow('Invalid status transition');
    });

    test('should prevent modification of terminal states', () => {
      // Complete the offer
      testOffer.updateStatus('accepted', riderUser);
      testOffer.updateStatus('picked_up', riderUser);
      testOffer.updateStatus('in_transit', riderUser);
      testOffer.updateStatus('delivered', riderUser);
      testOffer.updateStatus('completed', businessUser);
      
      // Cannot modify completed offer
      expect(() => {
        testOffer.updateStatus('cancelled', businessUser);
      }).toThrow('Invalid status transition');
    });
  });

  describe('Status Information', () => {
    test('should provide current status information', () => {
      testOffer.updateStatus('accepted', riderUser);
      
      const statusInfo = testOffer.getCurrentStatusInfo();
      expect(statusInfo.currentStatus).toBe('accepted');
      expect(statusInfo.validNextStates).toEqual(['picked_up', 'cancelled']);
      expect(statusInfo.isTerminal).toBe(false);
      expect(statusInfo.assignedRider).toEqual(riderUser);
    });

    test('should track status history', () => {
      testOffer.updateStatus('accepted', riderUser, { notes: 'Accepted offer' });
      testOffer.updateStatus('picked_up', riderUser, { notes: 'Package collected' });
      
      const history = testOffer.getStatusHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history[0].status).toBe('accepted');
      expect(history[0].notes).toBe('Accepted offer');
      expect(history[1].status).toBe('picked_up');
      expect(history[1].notes).toBe('Package collected');
    });

    test('should determine modification permissions', () => {
      // Business can modify open offers
      const businessPermission = testOffer.canBeModifiedBy(businessUser);
      expect(businessPermission.canModify).toBe(true);
      expect(businessPermission.allowedActions).toContain('cancel');
      
      // Accept offer
      testOffer.updateStatus('accepted', riderUser);
      
      // Assigned rider can modify
      const riderPermission = testOffer.canBeModifiedBy(riderUser);
      expect(riderPermission.canModify).toBe(true);
      expect(riderPermission.allowedActions).toContain('updateStatus');
      
      // Unauthorized user cannot modify
      const unauthorizedUser = new mongoose.Types.ObjectId();
      const unauthorizedPermission = testOffer.canBeModifiedBy(unauthorizedUser);
      expect(unauthorizedPermission.canModify).toBe(false);
      expect(unauthorizedPermission.reason).toBe('Insufficient permissions');
    });
  });

  describe('Endpoint Response Structure', () => {
    test('should return proper status update response structure', () => {
      const result = testOffer.updateStatus('accepted', riderUser, { 
        notes: 'Ready to deliver',
        location: { coordinates: [-74.006, 40.7128] }
      });
      
      expect(result).toEqual({
        previousStatus: 'open',
        newStatus: 'accepted',
        timestamp: expect.any(Date),
        updatedBy: riderUser
      });
    });

    test('should include location data in status history', () => {
      const location = { coordinates: [-74.006, 40.7128] };
      testOffer.updateStatus('accepted', riderUser, { 
        notes: 'Accepted with location',
        location 
      });
      
      const history = testOffer.getStatusHistory();
      const latestEntry = history[history.length - 1];
      expect(latestEntry.location).toEqual(expect.objectContaining({
        coordinates: [-74.006, 40.7128]
      }));
    });
  });

  describe('Error Handling', () => {
    test('should provide detailed error messages', () => {
      try {
        testOffer.updateStatus('delivered', riderUser);
      } catch (error) {
        expect(error.message).toContain('Invalid status transition from \'open\' to \'delivered\'');
      }
      
      try {
        testOffer.updateStatus('accepted', businessUser);
      } catch (error) {
        expect(error.message).toBe('Only riders can accept offers');
      }
    });

    test('should handle edge cases', () => {
      // Null user ID
      expect(() => {
        testOffer.updateStatus('accepted', null);
      }).toThrow();
      
      // Invalid status
      expect(() => {
        testOffer.updateStatus('invalid_status', riderUser);
      }).toThrow();
    });
  });

  describe('Business Logic Scenarios', () => {
    test('should handle multiple riders attempting to accept', () => {
      const rider1 = new mongoose.Types.ObjectId();
      const rider2 = new mongoose.Types.ObjectId();
      
      // First rider accepts
      testOffer.updateStatus('accepted', rider1);
      expect(testOffer.acceptedBy).toEqual(rider1);
      
      // Second rider cannot accept
      expect(() => {
        testOffer.updateStatus('accepted', rider2);
      }).toThrow('Offer already accepted by another rider');
    });

    test('should allow both business and rider to complete offers', () => {
      // Set up delivered offer
      testOffer.updateStatus('accepted', riderUser);
      testOffer.updateStatus('picked_up', riderUser);
      testOffer.updateStatus('in_transit', riderUser);
      testOffer.updateStatus('delivered', riderUser);
      
      // Business can complete
      expect(() => {
        testOffer.updateStatus('completed', businessUser);
      }).not.toThrow();
      
      // Reset to delivered state
      testOffer.status = 'delivered';
      
      // Rider can also complete
      expect(() => {
        testOffer.updateStatus('completed', riderUser);
      }).not.toThrow();
    });

    test('should track user roles correctly', () => {
      expect(testOffer.getUserRole(businessUser)).toBe('business');
      expect(testOffer.getUserRole(riderUser)).toBe('unknown'); // Not assigned yet
      
      testOffer.updateStatus('accepted', riderUser);
      expect(testOffer.getUserRole(riderUser)).toBe('rider');
      
      const unknownUser = new mongoose.Types.ObjectId();
      expect(testOffer.getUserRole(unknownUser)).toBe('unknown');
    });
  });
});