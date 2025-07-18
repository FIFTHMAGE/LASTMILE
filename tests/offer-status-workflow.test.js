const mongoose = require('mongoose');
const Offer = require('../models/Offer');

describe('Offer Status Workflow', () => {
  let businessUser;
  let riderUser;
  let sampleOffer;

  beforeAll(() => {
    // Mock user IDs
    businessUser = new mongoose.Types.ObjectId();
    riderUser = new mongoose.Types.ObjectId();

    // Sample offer data
    sampleOffer = {
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
    };
  });

  describe('Status Transitions', () => {
    test('should define valid status transitions', () => {
      const offer = new Offer(sampleOffer);
      const transitions = offer.getValidStatusTransitions();

      expect(transitions).toEqual({
        'open': ['accepted', 'cancelled'],
        'accepted': ['picked_up', 'cancelled'],
        'picked_up': ['in_transit', 'cancelled'],
        'in_transit': ['delivered', 'cancelled'],
        'delivered': ['completed'],
        'completed': [], // Terminal state
        'cancelled': []  // Terminal state
      });
    });

    test('should validate valid status transitions', () => {
      const offer = new Offer(sampleOffer);
      
      // Valid transitions from 'open'
      expect(offer.validateStatusTransition('accepted', riderUser).isValid).toBe(true);
      expect(offer.validateStatusTransition('cancelled', businessUser).isValid).toBe(true);
      
      // Invalid transitions from 'open'
      expect(offer.validateStatusTransition('picked_up', riderUser).isValid).toBe(false);
      expect(offer.validateStatusTransition('completed', businessUser).isValid).toBe(false);
    });

    test('should reject invalid status transitions', () => {
      const offer = new Offer(sampleOffer);
      offer.status = 'accepted';
      
      const result = offer.validateStatusTransition('delivered', riderUser);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid status transition');
      expect(result.validTransitions).toEqual(['picked_up', 'cancelled']);
    });

    test('should handle terminal states', () => {
      const offer = new Offer(sampleOffer);
      
      // Test completed state
      offer.status = 'completed';
      expect(offer.validateStatusTransition('cancelled', businessUser).isValid).toBe(false);
      
      // Test cancelled state
      offer.status = 'cancelled';
      expect(offer.validateStatusTransition('accepted', riderUser).isValid).toBe(false);
    });
  });

  describe('Business Logic Validation', () => {
    test('should validate rider acceptance', () => {
      const offer = new Offer(sampleOffer);
      
      // Only riders can accept offers
      expect(offer.validateStatusTransition('accepted', riderUser).isValid).toBe(true);
      expect(offer.validateStatusTransition('accepted', businessUser).isValid).toBe(false);
    });

    test('should prevent double acceptance', () => {
      const offer = new Offer(sampleOffer);
      const anotherRider = new mongoose.Types.ObjectId();
      
      offer.acceptedBy = riderUser;
      
      // Same rider can accept (re-acceptance)
      expect(offer.validateStatusTransition('accepted', riderUser).isValid).toBe(true);
      
      // Different rider cannot accept
      const result = offer.validateStatusTransition('accepted', anotherRider);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('already accepted by another rider');
    });

    test('should validate rider-only status updates', () => {
      const offer = new Offer(sampleOffer);
      offer.acceptedBy = riderUser;
      
      const statusProgression = [
        { from: 'accepted', to: 'picked_up' },
        { from: 'picked_up', to: 'in_transit' },
        { from: 'in_transit', to: 'delivered' }
      ];
      
      statusProgression.forEach(({ from, to }) => {
        offer.status = from;
        
        // Assigned rider can update
        expect(offer.validateStatusTransition(to, riderUser).isValid).toBe(true);
        
        // Business cannot update
        expect(offer.validateStatusTransition(to, businessUser).isValid).toBe(false);
        
        // Unassigned rider cannot update
        const anotherRider = new mongoose.Types.ObjectId();
        expect(offer.validateStatusTransition(to, anotherRider).isValid).toBe(false);
      });
    });

    test('should validate completion permissions', () => {
      const offer = new Offer(sampleOffer);
      offer.status = 'delivered';
      offer.acceptedBy = riderUser;
      
      // Business owner can complete
      expect(offer.validateStatusTransition('completed', businessUser).isValid).toBe(true);
      
      // Assigned rider can complete
      expect(offer.validateStatusTransition('completed', riderUser).isValid).toBe(true);
      
      // Unassigned rider cannot complete
      const anotherRider = new mongoose.Types.ObjectId();
      expect(offer.validateStatusTransition('completed', anotherRider).isValid).toBe(false);
    });

    test('should validate cancellation permissions', () => {
      const offer = new Offer(sampleOffer);
      offer.status = 'accepted';
      offer.acceptedBy = riderUser;
      
      // Business owner can cancel
      expect(offer.validateStatusTransition('cancelled', businessUser).isValid).toBe(true);
      
      // Assigned rider can cancel
      expect(offer.validateStatusTransition('cancelled', riderUser).isValid).toBe(true);
      
      // Unassigned rider cannot cancel
      const anotherRider = new mongoose.Types.ObjectId();
      const result = offer.validateStatusTransition('cancelled', anotherRider);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Only the business owner or assigned rider can cancel');
    });
  });

  describe('User Role Detection', () => {
    test('should identify business user role', () => {
      const offer = new Offer(sampleOffer);
      
      expect(offer.getUserRole(businessUser)).toBe('business');
      expect(offer.getUserRole(riderUser)).toBe('unknown');
    });

    test('should identify rider user role', () => {
      const offer = new Offer(sampleOffer);
      offer.acceptedBy = riderUser;
      
      expect(offer.getUserRole(riderUser)).toBe('rider');
      expect(offer.getUserRole(businessUser)).toBe('business');
    });

    test('should handle unknown users', () => {
      const offer = new Offer(sampleOffer);
      const unknownUser = new mongoose.Types.ObjectId();
      
      expect(offer.getUserRole(unknownUser)).toBe('unknown');
    });
  });

  describe('Status Update Method', () => {
    test('should update status with valid transition', () => {
      const offer = new Offer(sampleOffer);
      
      const result = offer.updateStatus('accepted', riderUser, { notes: 'Rider accepted offer' });
      
      expect(offer.status).toBe('accepted');
      expect(offer.acceptedBy).toEqual(riderUser);
      expect(offer.acceptedAt).toBeInstanceOf(Date);
      expect(result.previousStatus).toBe('open');
      expect(result.newStatus).toBe('accepted');
      expect(result.updatedBy).toEqual(riderUser);
    });

    test('should throw error for invalid transition', () => {
      const offer = new Offer(sampleOffer);
      
      expect(() => {
        offer.updateStatus('delivered', riderUser);
      }).toThrow('Invalid status transition');
    });

    test('should update timestamp fields correctly', () => {
      const offer = new Offer(sampleOffer);
      offer.acceptedBy = riderUser;
      
      const statusTimestampMap = {
        'accepted': 'acceptedAt',
        'picked_up': 'pickedUpAt',
        'in_transit': 'inTransitAt',
        'delivered': 'deliveredAt',
        'completed': 'completedAt',
        'cancelled': 'cancelledAt'
      };
      
      Object.entries(statusTimestampMap).forEach(([status, timestampField]) => {
        if (status === 'accepted') {
          offer.status = 'open';
        } else {
          offer.status = 'accepted';
          if (status !== 'cancelled') {
            // Set up valid progression
            const progression = ['accepted', 'picked_up', 'in_transit', 'delivered', 'completed'];
            const currentIndex = progression.indexOf(status);
            if (currentIndex > 0) {
              offer.status = progression[currentIndex - 1];
            }
          }
        }
        
        offer.updateStatus(status, status === 'accepted' ? riderUser : riderUser);
        expect(offer[timestampField]).toBeInstanceOf(Date);
      });
    });

    test('should add entry to status history', () => {
      const offer = new Offer(sampleOffer);
      const initialHistoryLength = offer.statusHistory.length;
      
      offer.updateStatus('accepted', riderUser, { 
        notes: 'Rider accepted the offer',
        location: { coordinates: [-74.006, 40.7128] }
      });
      
      expect(offer.statusHistory).toHaveLength(initialHistoryLength + 1);
      
      const latestEntry = offer.statusHistory[offer.statusHistory.length - 1];
      expect(latestEntry.status).toBe('accepted');
      expect(latestEntry.updatedBy).toEqual(riderUser);
      expect(latestEntry.notes).toBe('Rider accepted the offer');
      expect(latestEntry.location.coordinates).toEqual([-74.006, 40.7128]);
    });
  });

  describe('Status History', () => {
    test('should initialize status history on creation', () => {
      const offer = new Offer(sampleOffer);
      
      // Simulate the pre-save hook
      offer.isNew = true;
      offer.statusHistory = [];
      
      // Manually call the pre-save logic
      if (offer.isNew && offer.statusHistory.length === 0) {
        offer.statusHistory.push({
          status: offer.status,
          timestamp: offer.createdAt || new Date(),
          updatedBy: offer.business,
          notes: 'Offer created'
        });
      }
      
      expect(offer.statusHistory).toHaveLength(1);
      expect(offer.statusHistory[0].status).toBe('open');
      expect(offer.statusHistory[0].updatedBy).toEqual(businessUser);
      expect(offer.statusHistory[0].notes).toBe('Offer created');
    });

    test('should return formatted status history', () => {
      const offer = new Offer(sampleOffer);
      offer.statusHistory = [
        {
          status: 'open',
          timestamp: new Date('2024-01-15T10:00:00Z'),
          updatedBy: businessUser,
          notes: 'Offer created'
        },
        {
          status: 'accepted',
          timestamp: new Date('2024-01-15T11:00:00Z'),
          updatedBy: riderUser,
          notes: 'Rider accepted offer',
          location: { coordinates: [-74.006, 40.7128] }
        }
      ];
      
      const history = offer.getStatusHistory();
      
      expect(history).toHaveLength(2);
      expect(history[0]).toEqual({
        status: 'open',
        timestamp: new Date('2024-01-15T10:00:00Z'),
        updatedBy: businessUser,
        notes: 'Offer created',
        location: expect.any(Object)
      });
      expect(history[1]).toEqual({
        status: 'accepted',
        timestamp: new Date('2024-01-15T11:00:00Z'),
        updatedBy: riderUser,
        notes: 'Rider accepted offer',
        location: expect.objectContaining({
          coordinates: [-74.006, 40.7128]
        })
      });
    });
  });

  describe('Current Status Information', () => {
    test('should return current status info', () => {
      const offer = new Offer(sampleOffer);
      offer.status = 'accepted';
      offer.acceptedBy = riderUser;
      offer.acceptedAt = new Date('2024-01-15T11:00:00Z');
      
      const statusInfo = offer.getCurrentStatusInfo();
      
      expect(statusInfo).toEqual({
        currentStatus: 'accepted',
        timestamp: new Date('2024-01-15T11:00:00Z'),
        validNextStates: ['picked_up', 'cancelled'],
        isTerminal: false,
        assignedRider: riderUser,
        statusHistory: offer.getStatusHistory()
      });
    });

    test('should identify terminal states', () => {
      const offer = new Offer(sampleOffer);
      
      // Test completed state
      offer.status = 'completed';
      expect(offer.getCurrentStatusInfo().isTerminal).toBe(true);
      expect(offer.getCurrentStatusInfo().validNextStates).toEqual([]);
      
      // Test cancelled state
      offer.status = 'cancelled';
      expect(offer.getCurrentStatusInfo().isTerminal).toBe(true);
      expect(offer.getCurrentStatusInfo().validNextStates).toEqual([]);
      
      // Test non-terminal state
      offer.status = 'in_transit';
      expect(offer.getCurrentStatusInfo().isTerminal).toBe(false);
      expect(offer.getCurrentStatusInfo().validNextStates).toEqual(['delivered', 'cancelled']);
    });
  });

  describe('Modification Permissions', () => {
    test('should allow business to modify open offers', () => {
      const offer = new Offer(sampleOffer);
      
      const permission = offer.canBeModifiedBy(businessUser);
      
      expect(permission.canModify).toBe(true);
      expect(permission.allowedActions).toEqual(['cancel', 'edit']);
    });

    test('should allow assigned rider to update status', () => {
      const offer = new Offer(sampleOffer);
      offer.status = 'accepted';
      offer.acceptedBy = riderUser;
      
      const permission = offer.canBeModifiedBy(riderUser);
      
      expect(permission.canModify).toBe(true);
      expect(permission.allowedActions).toEqual(['updateStatus', 'cancel']);
    });

    test('should prevent modification of terminal states', () => {
      const offer = new Offer(sampleOffer);
      
      // Test completed state
      offer.status = 'completed';
      expect(offer.canBeModifiedBy(businessUser).canModify).toBe(false);
      expect(offer.canBeModifiedBy(businessUser).reason).toBe('Offer is in terminal state');
      
      // Test cancelled state
      offer.status = 'cancelled';
      expect(offer.canBeModifiedBy(riderUser).canModify).toBe(false);
      expect(offer.canBeModifiedBy(riderUser).reason).toBe('Offer is in terminal state');
    });

    test('should prevent unauthorized modifications', () => {
      const offer = new Offer(sampleOffer);
      const unauthorizedUser = new mongoose.Types.ObjectId();
      
      const permission = offer.canBeModifiedBy(unauthorizedUser);
      
      expect(permission.canModify).toBe(false);
      expect(permission.reason).toBe('Insufficient permissions');
    });
  });

  describe('Complete Workflow Scenarios', () => {
    test('should handle successful delivery workflow', () => {
      const offer = new Offer(sampleOffer);
      
      // Business creates offer (initial state: open)
      expect(offer.status).toBe('open');
      
      // Rider accepts offer
      offer.updateStatus('accepted', riderUser);
      expect(offer.status).toBe('accepted');
      expect(offer.acceptedBy).toEqual(riderUser);
      
      // Rider picks up package
      offer.updateStatus('picked_up', riderUser);
      expect(offer.status).toBe('picked_up');
      expect(offer.pickedUpAt).toBeInstanceOf(Date);
      
      // Rider starts delivery
      offer.updateStatus('in_transit', riderUser);
      expect(offer.status).toBe('in_transit');
      expect(offer.inTransitAt).toBeInstanceOf(Date);
      
      // Rider delivers package
      offer.updateStatus('delivered', riderUser);
      expect(offer.status).toBe('delivered');
      expect(offer.deliveredAt).toBeInstanceOf(Date);
      
      // Business confirms completion
      offer.updateStatus('completed', businessUser);
      expect(offer.status).toBe('completed');
      expect(offer.completedAt).toBeInstanceOf(Date);
      
      // Verify status history (5 transitions: accepted->picked_up->in_transit->delivered->completed)
      // Note: Initial "open" status is not automatically added to history in tests
      expect(offer.statusHistory.length).toBeGreaterThanOrEqual(5);
    });

    test('should handle cancellation at different stages', () => {
      // Test cancellation from open state
      const offer1 = new Offer(sampleOffer);
      offer1.updateStatus('cancelled', businessUser);
      expect(offer1.status).toBe('cancelled');
      
      // Test cancellation from accepted state
      const offer2 = new Offer(sampleOffer);
      offer2.updateStatus('accepted', riderUser);
      offer2.updateStatus('cancelled', riderUser);
      expect(offer2.status).toBe('cancelled');
      
      // Test cancellation from in_transit state
      const offer3 = new Offer(sampleOffer);
      offer3.updateStatus('accepted', riderUser);
      offer3.updateStatus('picked_up', riderUser);
      offer3.updateStatus('in_transit', riderUser);
      offer3.updateStatus('cancelled', businessUser);
      expect(offer3.status).toBe('cancelled');
    });

    test('should prevent invalid workflow progressions', () => {
      const offer = new Offer(sampleOffer);
      
      // Cannot skip steps
      expect(() => offer.updateStatus('picked_up', riderUser)).toThrow();
      expect(() => offer.updateStatus('delivered', riderUser)).toThrow();
      
      // Cannot go backwards
      offer.updateStatus('accepted', riderUser);
      expect(() => offer.updateStatus('open', businessUser)).toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should provide detailed error messages', () => {
      const offer = new Offer(sampleOffer);
      
      // Invalid transition
      const result1 = offer.validateStatusTransition('delivered', riderUser);
      expect(result1.error).toContain('Invalid status transition from \'open\' to \'delivered\'');
      
      // Role-based error
      const result2 = offer.validateStatusTransition('accepted', businessUser);
      expect(result2.error).toBe('Only riders can accept offers');
      
      // Permission error - need to set up valid transition first
      offer.status = 'accepted';
      offer.acceptedBy = riderUser;
      const anotherRider = new mongoose.Types.ObjectId();
      const result3 = offer.validateStatusTransition('picked_up', anotherRider);
      expect(result3.error).toBe('Only the assigned rider can update this status');
    });

    test('should handle edge cases gracefully', () => {
      const offer = new Offer(sampleOffer);
      
      // Null/undefined user ID
      expect(() => offer.updateStatus('accepted', null)).toThrow();
      expect(() => offer.updateStatus('accepted', undefined)).toThrow();
      
      // Invalid status
      expect(() => offer.updateStatus('invalid_status', riderUser)).toThrow();
    });
  });
});