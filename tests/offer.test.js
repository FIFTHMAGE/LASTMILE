const Offer = require('../models/Offer');

describe('Enhanced Offer Model', () => {
  describe('Offer Creation', () => {
    test('should create an offer with complete details', () => {
      const offerData = {
        business: '507f1f77bcf86cd799439011',
        title: 'Urgent Document Delivery',
        description: 'Important legal documents need to be delivered today',
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
          address: '123 Business St, New York, NY 10001',
          coordinates: [-74.006, 40.7128],
          contactName: 'John Smith',
          contactPhone: '+1-555-0123',
          availableFrom: new Date('2024-01-15T09:00:00Z'),
          availableUntil: new Date('2024-01-15T17:00:00Z'),
          instructions: 'Ask for reception desk'
        },
        delivery: {
          address: '456 Client Ave, Brooklyn, NY 11201',
          coordinates: [-73.9903, 40.6892],
          contactName: 'Jane Doe',
          contactPhone: '+1-555-0456',
          deliverBy: new Date('2024-01-15T18:00:00Z'),
          instructions: 'Ring apartment 3B'
        },
        payment: {
          amount: 25.00,
          currency: 'USD',
          paymentMethod: 'digital'
        }
      };

      const offer = new Offer(offerData);

      expect(offer.title).toBe('Urgent Document Delivery');
      expect(offer.packageDetails.weight).toBe(0.5);
      expect(offer.packageDetails.fragile).toBe(false);
      expect(offer.pickup.address).toBe('123 Business St, New York, NY 10001');
      expect(offer.pickup.coordinates).toEqual([-74.006, 40.7128]);
      expect(offer.delivery.contactName).toBe('Jane Doe');
      expect(offer.payment.amount).toBe(25.00);
      expect(offer.payment.currency).toBe('USD');
      expect(offer.status).toBe('open');
    });

    test('should set default values correctly', () => {
      const minimalOffer = new Offer({
        business: '507f1f77bcf86cd799439011',
        title: 'Simple Delivery',
        pickup: {
          address: '123 Main St',
          coordinates: [-74.006, 40.7128],
          contactName: 'John',
          contactPhone: '+1-555-0123'
        },
        delivery: {
          address: '456 Oak Ave',
          coordinates: [-73.9903, 40.6892],
          contactName: 'Jane',
          contactPhone: '+1-555-0456'
        },
        payment: {
          amount: 15.00
        }
      });

      expect(minimalOffer.packageDetails.fragile).toBe(false);
      expect(minimalOffer.payment.currency).toBe('USD');
      expect(minimalOffer.payment.paymentMethod).toBe('digital');
      expect(minimalOffer.status).toBe('open');
      expect(minimalOffer.createdAt).toBeDefined();
      expect(minimalOffer.updatedAt).toBeDefined();
    });
  });

  describe('Offer Validation', () => {
    test('should validate complete offer successfully', () => {
      const validOffer = new Offer({
        business: '507f1f77bcf86cd799439011',
        title: 'Valid Delivery',
        pickup: {
          address: '123 Main St',
          coordinates: [-74.006, 40.7128],
          contactName: 'John Smith',
          contactPhone: '+1-555-0123'
        },
        delivery: {
          address: '456 Oak Ave',
          coordinates: [-73.9903, 40.6892],
          contactName: 'Jane Doe',
          contactPhone: '+1-555-0456'
        },
        payment: {
          amount: 20.00
        }
      });

      const errors = validOffer.validateOffer();
      expect(errors).toHaveLength(0);
    });

    test('should return validation errors for missing required fields', () => {
      const incompleteOffer = new Offer({
        business: '507f1f77bcf86cd799439011',
        // Missing title
        pickup: {
          address: '123 Main St',
          coordinates: [-74.006, 40.7128],
          // Missing contactName and contactPhone
        },
        delivery: {
          // Missing address, coordinates, contactName, contactPhone
        },
        payment: {
          // Missing amount
        }
      });

      const errors = incompleteOffer.validateOffer();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('Title is required');
      expect(errors).toContain('Pickup contact name is required');
      expect(errors).toContain('Pickup contact phone is required');
      expect(errors).toContain('Delivery address is required');
      expect(errors).toContain('Delivery contact name is required');
      expect(errors).toContain('Delivery contact phone is required');
      expect(errors).toContain('Valid payment amount is required');
    });

    test('should validate coordinates format', () => {
      const invalidCoordinatesOffer = new Offer({
        business: '507f1f77bcf86cd799439011',
        title: 'Invalid Coordinates',
        pickup: {
          address: '123 Main St',
          coordinates: [-74.006], // Invalid: only one coordinate
          contactName: 'John',
          contactPhone: '+1-555-0123'
        },
        delivery: {
          address: '456 Oak Ave',
          coordinates: [], // Invalid: empty coordinates
          contactName: 'Jane',
          contactPhone: '+1-555-0456'
        },
        payment: {
          amount: 15.00
        }
      });

      const errors = invalidCoordinatesOffer.validateOffer();
      expect(errors).toContain('Valid pickup coordinates are required');
      expect(errors).toContain('Valid delivery coordinates are required');
    });

    test('should validate date logic', () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday
      const futureDate1 = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      const futureDate2 = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now

      const invalidDatesOffer = new Offer({
        business: '507f1f77bcf86cd799439011',
        title: 'Invalid Dates',
        pickup: {
          address: '123 Main St',
          coordinates: [-74.006, 40.7128],
          contactName: 'John',
          contactPhone: '+1-555-0123',
          availableFrom: futureDate1,
          availableUntil: futureDate2 // Until time before from time
        },
        delivery: {
          address: '456 Oak Ave',
          coordinates: [-73.9903, 40.6892],
          contactName: 'Jane',
          contactPhone: '+1-555-0456',
          deliverBy: pastDate // Past delivery date
        },
        payment: {
          amount: 15.00
        }
      });

      const errors = invalidDatesOffer.validateOffer();
      expect(errors).toContain('Pickup available until time must be after available from time');
      expect(errors).toContain('Delivery deadline must be in the future');
    });
  });

  describe('Distance Calculation', () => {
    test('should calculate distance between pickup and delivery', () => {
      const offer = new Offer({
        business: '507f1f77bcf86cd799439011',
        title: 'Distance Test',
        pickup: {
          address: '123 Main St',
          coordinates: [-74.006, 40.7128], // Manhattan
          contactName: 'John',
          contactPhone: '+1-555-0123'
        },
        delivery: {
          address: '456 Oak Ave',
          coordinates: [-73.9903, 40.6892], // Brooklyn
          contactName: 'Jane',
          contactPhone: '+1-555-0456'
        },
        payment: {
          amount: 15.00
        }
      });

      const distance = offer.calculateDistance();
      expect(distance).toBeGreaterThan(0);
      expect(typeof distance).toBe('number');
      // Distance between Manhattan and Brooklyn should be several kilometers
      expect(distance).toBeGreaterThan(1000); // More than 1km
      expect(distance).toBeLessThan(50000); // Less than 50km
    });

    test('should return null for missing coordinates', () => {
      const offer = new Offer({
        business: '507f1f77bcf86cd799439011',
        title: 'No Coordinates',
        pickup: {
          address: '123 Main St',
          contactName: 'John',
          contactPhone: '+1-555-0123'
        },
        delivery: {
          address: '456 Oak Ave',
          contactName: 'Jane',
          contactPhone: '+1-555-0456'
        },
        payment: {
          amount: 15.00
        }
      });

      const distance = offer.calculateDistance();
      expect(distance).toBeNull();
    });
  });

  describe('Delivery Time Estimation', () => {
    test('should estimate delivery time for different vehicle types', () => {
      const offer = new Offer({
        business: '507f1f77bcf86cd799439011',
        title: 'Time Estimation Test',
        pickup: {
          address: '123 Main St',
          coordinates: [-74.006, 40.7128],
          contactName: 'John',
          contactPhone: '+1-555-0123'
        },
        delivery: {
          address: '456 Oak Ave',
          coordinates: [-73.9903, 40.6892],
          contactName: 'Jane',
          contactPhone: '+1-555-0456'
        },
        payment: {
          amount: 15.00
        }
      });

      const bikeTime = offer.estimateDeliveryTime('bike');
      const carTime = offer.estimateDeliveryTime('car');
      const scooterTime = offer.estimateDeliveryTime('scooter');

      expect(bikeTime).toBeGreaterThan(0);
      expect(carTime).toBeGreaterThan(0);
      expect(scooterTime).toBeGreaterThan(0);
      
      // Car should be faster than bike
      expect(carTime).toBeLessThan(bikeTime);
      // Scooter should be faster than bike but slower than car
      expect(scooterTime).toBeLessThan(bikeTime);
      expect(scooterTime).toBeGreaterThan(carTime);
    });

    test('should return null for offers without distance', () => {
      const offer = new Offer({
        business: '507f1f77bcf86cd799439011',
        title: 'No Distance',
        pickup: {
          address: '123 Main St',
          contactName: 'John',
          contactPhone: '+1-555-0123'
        },
        delivery: {
          address: '456 Oak Ave',
          contactName: 'Jane',
          contactPhone: '+1-555-0456'
        },
        payment: {
          amount: 15.00
        }
      });

      const estimatedTime = offer.estimateDeliveryTime('bike');
      expect(estimatedTime).toBeNull();
    });
  });

  describe('Offer Summary', () => {
    test('should return correct summary data', () => {
      const offer = new Offer({
        business: '507f1f77bcf86cd799439011',
        title: 'Summary Test',
        description: 'Test description',
        pickup: {
          address: '123 Main St',
          coordinates: [-74.006, 40.7128],
          contactName: 'John',
          contactPhone: '+1-555-0123',
          availableFrom: new Date('2024-01-15T09:00:00Z'),
          availableUntil: new Date('2024-01-15T17:00:00Z')
        },
        delivery: {
          address: '456 Oak Ave',
          coordinates: [-73.9903, 40.6892],
          contactName: 'Jane',
          contactPhone: '+1-555-0456',
          deliverBy: new Date('2024-01-15T18:00:00Z')
        },
        payment: {
          amount: 25.00,
          currency: 'USD',
          paymentMethod: 'digital'
        },
        estimatedDistance: 5000,
        estimatedDuration: 30
      });

      const summary = offer.getSummary();

      expect(summary.title).toBe('Summary Test');
      expect(summary.description).toBe('Test description');
      expect(summary.pickup.address).toBe('123 Main St');
      expect(summary.delivery.address).toBe('456 Oak Ave');
      expect(summary.payment.amount).toBe(25.00);
      expect(summary.status).toBe('open');
      expect(summary.estimatedDistance).toBe(5000);
      expect(summary.estimatedDuration).toBe(30);
      expect(summary.createdAt).toBeDefined();
    });
  });

  describe('Status Management', () => {
    test('should accept valid status values', () => {
      const validStatuses = ['open', 'accepted', 'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled'];
      
      validStatuses.forEach(status => {
        const offer = new Offer({
          business: '507f1f77bcf86cd799439011',
          title: 'Status Test',
          pickup: {
            address: '123 Main St',
            coordinates: [-74.006, 40.7128],
            contactName: 'John',
            contactPhone: '+1-555-0123'
          },
          delivery: {
            address: '456 Oak Ave',
            coordinates: [-73.9903, 40.6892],
            contactName: 'Jane',
            contactPhone: '+1-555-0456'
          },
          payment: {
            amount: 15.00
          },
          status: status
        });

        expect(offer.status).toBe(status);
      });
    });
  });
});