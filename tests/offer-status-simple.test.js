const mongoose = require('mongoose');
const Offer = require('../models/Offer');

describe('Offer Status Updates', () => {
  let businessUser, riderUser, testOffer;

  beforeAll(() => {
    businessUser = new mongoose.Types.ObjectId();
    riderUser = new mongoose.Types.ObjectId();
  });

  beforeEach(() => {
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

  test('should complete full delivery workflow', () => {
    expect(testOffer.status).toBe('open');
    
    testOffer.updateStatus('accepted', riderUser);
    expect(testOffer.status).toBe('accepted');
    
    testOffer.updateStatus('picked_up', riderUser);
    expect(testOffer.status).toBe('picked_up');
    
    testOffer.updateStatus('in_transit', riderUser);
    expect(testOffer.status).toBe('in_transit');
    
    testOffer.updateStatus('delivered', riderUser);
    expect(testOffer.status).toBe('delivered');
    
    testOffer.updateStatus('completed', businessUser);
    expect(testOffer.status).toBe('completed');
  });

  test('should validate status transitions', () => {
    expect(() => {
      testOffer.updateStatus('delivered', riderUser);
    }).toThrow('Invalid status transition');
  });

  test('should enforce role permissions', () => {
    expect(() => {
      testOffer.updateStatus('accepted', businessUser);
    }).toThrow('Only riders can accept offers');
  });
});