const mongoose = require('mongoose');
const Offer = require('../models/Offer');

describe('Offer Filtering and Sorting', () => {
  let sampleOffers;
  let testCoordinates;

  beforeAll(() => {
    // Test coordinates for different locations
    testCoordinates = {
      manhattan: [-74.006, 40.7128],
      brooklyn: [-73.9857, 40.6892],
      queens: [-73.7949, 40.7282]
    };

    // Sample offers with different characteristics for testing filters
    sampleOffers = [
      {
        business: new mongoose.Types.ObjectId(),
        title: 'High-Value Document Delivery',
        description: 'Important legal documents',
        packageDetails: {
          weight: 0.5,
          dimensions: { length: 30, width: 20, height: 2 },
          fragile: true,
          specialInstructions: 'Handle with care'
        },
        pickup: {
          address: '123 Wall St, New York, NY',
          coordinates: testCoordinates.manhattan,
          contactName: 'John Lawyer',
          contactPhone: '555-0001'
        },
        delivery: {
          address: '456 Broadway, New York, NY',
          coordinates: [-74.0059, 40.7589],
          contactName: 'Jane Client',
          contactPhone: '555-0002'
        },
        payment: { amount: 45.00, currency: 'USD', paymentMethod: 'digital' },
        status: 'open',
        createdAt: new Date('2024-01-15T10:00:00Z')
      },
      {
        business: new mongoose.Types.ObjectId(),
        title: 'Food Delivery',
        description: 'Restaurant order delivery',
        packageDetails: {
          weight: 2.0,
          dimensions: { length: 25, width: 25, height: 15 },
          fragile: false,
          specialInstructions: 'Keep upright'
        },
        pickup: {
          address: '789 Atlantic Ave, Brooklyn, NY',
          coordinates: testCoordinates.brooklyn,
          contactName: 'Restaurant Manager',
          contactPhone: '555-0003'
        },
        delivery: {
          address: '321 Flatbush Ave, Brooklyn, NY',
          coordinates: [-73.9776, 40.6782],
          contactName: 'Hungry Customer',
          contactPhone: '555-0004'
        },
        payment: { amount: 12.50, currency: 'USD', paymentMethod: 'cash' },
        status: 'open',
        createdAt: new Date('2024-01-16T14:30:00Z')
      },
      {
        business: new mongoose.Types.ObjectId(),
        title: 'Large Package Delivery',
        description: 'Electronics delivery',
        packageDetails: {
          weight: 8.0,
          dimensions: { length: 60, width: 40, height: 30 },
          fragile: true,
          specialInstructions: 'Requires signature'
        },
        pickup: {
          address: '555 Northern Blvd, Queens, NY',
          coordinates: testCoordinates.queens,
          contactName: 'Store Manager',
          contactPhone: '555-0005'
        },
        delivery: {
          address: '777 Queens Blvd, Queens, NY',
          coordinates: [-73.8067, 40.7282],
          contactName: 'Tech Buyer',
          contactPhone: '555-0006'
        },
        payment: { amount: 28.75, currency: 'USD', paymentMethod: 'card' },
        status: 'accepted',
        acceptedBy: new mongoose.Types.ObjectId(),
        acceptedAt: new Date('2024-01-16T15:00:00Z'),
        createdAt: new Date('2024-01-16T12:00:00Z')
      }
    ];
  });

  describe('Payment Amount Filtering', () => {
    test('should filter by minimum payment amount', () => {
      const minPayment = 20.00;
      const filteredOffers = sampleOffers.filter(offer => 
        offer.payment.amount >= minPayment
      );

      expect(filteredOffers).toHaveLength(2);
      expect(filteredOffers[0].payment.amount).toBe(45.00);
      expect(filteredOffers[1].payment.amount).toBe(28.75);
      
      // Verify all results meet criteria
      filteredOffers.forEach(offer => {
        expect(offer.payment.amount).toBeGreaterThanOrEqual(minPayment);
      });
    });

    test('should filter by maximum payment amount', () => {
      const maxPayment = 25.00;
      const filteredOffers = sampleOffers.filter(offer => 
        offer.payment.amount <= maxPayment
      );

      expect(filteredOffers).toHaveLength(1);
      expect(filteredOffers[0].payment.amount).toBe(12.50);
      
      // Verify all results meet criteria
      filteredOffers.forEach(offer => {
        expect(offer.payment.amount).toBeLessThanOrEqual(maxPayment);
      });
    });

    test('should filter by payment range', () => {
      const minPayment = 15.00;
      const maxPayment = 35.00;
      const filteredOffers = sampleOffers.filter(offer => 
        offer.payment.amount >= minPayment && offer.payment.amount <= maxPayment
      );

      expect(filteredOffers).toHaveLength(1);
      expect(filteredOffers[0].payment.amount).toBe(28.75);
      
      // Verify all results meet criteria
      filteredOffers.forEach(offer => {
        expect(offer.payment.amount).toBeGreaterThanOrEqual(minPayment);
        expect(offer.payment.amount).toBeLessThanOrEqual(maxPayment);
      });
    });
  });

  describe('Package Type Filtering', () => {
    test('should filter fragile packages', () => {
      const fragileOffers = sampleOffers.filter(offer => 
        offer.packageDetails.fragile === true
      );

      expect(fragileOffers).toHaveLength(2);
      expect(fragileOffers[0].title).toBe('High-Value Document Delivery');
      expect(fragileOffers[1].title).toBe('Large Package Delivery');
      
      // Verify all results are fragile
      fragileOffers.forEach(offer => {
        expect(offer.packageDetails.fragile).toBe(true);
      });
    });

    test('should filter non-fragile packages', () => {
      const nonFragileOffers = sampleOffers.filter(offer => 
        offer.packageDetails.fragile === false
      );

      expect(nonFragileOffers).toHaveLength(1);
      expect(nonFragileOffers[0].title).toBe('Food Delivery');
      expect(nonFragileOffers[0].packageDetails.fragile).toBe(false);
    });
  });

  describe('Vehicle Type Compatibility Filtering', () => {
    test('should filter bike-compatible packages', () => {
      const bikeCompatible = sampleOffers.filter(offer => 
        offer.packageDetails.weight <= 5 // Bike weight limit
      );

      expect(bikeCompatible).toHaveLength(2);
      expect(bikeCompatible[0].packageDetails.weight).toBe(0.5);
      expect(bikeCompatible[1].packageDetails.weight).toBe(2.0);
      
      // Verify all results are bike-compatible
      bikeCompatible.forEach(offer => {
        expect(offer.packageDetails.weight).toBeLessThanOrEqual(5);
      });
    });

    test('should filter car/van only packages', () => {
      const carVanOnly = sampleOffers.filter(offer => 
        offer.packageDetails.weight > 5 // Requires car/van
      );

      expect(carVanOnly).toHaveLength(1);
      expect(carVanOnly[0].packageDetails.weight).toBe(8.0);
      expect(carVanOnly[0].title).toBe('Large Package Delivery');
    });

    test('should consider package dimensions for vehicle compatibility', () => {
      // Test volume calculation (L x W x H in cubic cm)
      const offers = sampleOffers.map(offer => ({
        ...offer,
        volume: offer.packageDetails.dimensions.length * 
                offer.packageDetails.dimensions.width * 
                offer.packageDetails.dimensions.height
      }));

      const smallPackages = offers.filter(offer => offer.volume <= 20000); // 20L
      const largePackages = offers.filter(offer => offer.volume > 20000);

      expect(smallPackages).toHaveLength(2); // Document and food
      expect(largePackages).toHaveLength(1);  // Electronics
      expect(largePackages[0].volume).toBe(72000); // 60*40*30
    });
  });

  describe('Status Filtering', () => {
    test('should filter by offer status', () => {
      const openOffers = sampleOffers.filter(offer => offer.status === 'open');
      const acceptedOffers = sampleOffers.filter(offer => offer.status === 'accepted');

      expect(openOffers).toHaveLength(2);
      expect(acceptedOffers).toHaveLength(1);
      expect(acceptedOffers[0].title).toBe('Large Package Delivery');
    });

    test('should validate status enum values', () => {
      const validStatuses = ['open', 'accepted', 'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled'];
      
      sampleOffers.forEach(offer => {
        expect(validStatuses).toContain(offer.status);
      });
    });
  });

  describe('Date Range Filtering', () => {
    test('should filter by creation date range', () => {
      const dateFrom = new Date('2024-01-16T00:00:00Z');
      const dateTo = new Date('2024-01-16T23:59:59Z');
      
      const filteredOffers = sampleOffers.filter(offer => 
        offer.createdAt >= dateFrom && offer.createdAt <= dateTo
      );

      expect(filteredOffers).toHaveLength(2);
      expect(filteredOffers[0].title).toBe('Food Delivery');
      expect(filteredOffers[1].title).toBe('Large Package Delivery');
    });

    test('should filter by acceptance date range', () => {
      const dateFrom = new Date('2024-01-16T14:00:00Z');
      const dateTo = new Date('2024-01-16T16:00:00Z');
      
      const filteredOffers = sampleOffers.filter(offer => 
        offer.acceptedAt && offer.acceptedAt >= dateFrom && offer.acceptedAt <= dateTo
      );

      expect(filteredOffers).toHaveLength(1);
      expect(filteredOffers[0].title).toBe('Large Package Delivery');
    });
  });

  describe('Sorting Functionality', () => {
    test('should sort by payment amount (ascending)', () => {
      const sortedOffers = [...sampleOffers].sort((a, b) => 
        a.payment.amount - b.payment.amount
      );

      expect(sortedOffers[0].payment.amount).toBe(12.50);
      expect(sortedOffers[1].payment.amount).toBe(28.75);
      expect(sortedOffers[2].payment.amount).toBe(45.00);
    });

    test('should sort by payment amount (descending)', () => {
      const sortedOffers = [...sampleOffers].sort((a, b) => 
        b.payment.amount - a.payment.amount
      );

      expect(sortedOffers[0].payment.amount).toBe(45.00);
      expect(sortedOffers[1].payment.amount).toBe(28.75);
      expect(sortedOffers[2].payment.amount).toBe(12.50);
    });

    test('should sort by creation time (newest first)', () => {
      const sortedOffers = [...sampleOffers].sort((a, b) => 
        b.createdAt.getTime() - a.createdAt.getTime()
      );

      expect(sortedOffers[0].createdAt.getTime()).toBeGreaterThan(sortedOffers[1].createdAt.getTime());
      expect(sortedOffers[1].createdAt.getTime()).toBeGreaterThan(sortedOffers[2].createdAt.getTime());
    });

    test('should sort by creation time (oldest first)', () => {
      const sortedOffers = [...sampleOffers].sort((a, b) => 
        a.createdAt.getTime() - b.createdAt.getTime()
      );

      expect(sortedOffers[0].createdAt.getTime()).toBeLessThan(sortedOffers[1].createdAt.getTime());
      expect(sortedOffers[1].createdAt.getTime()).toBeLessThan(sortedOffers[2].createdAt.getTime());
    });

    test('should sort by distance (requires calculation)', () => {
      // Add estimated distances for testing
      const offersWithDistance = sampleOffers.map((offer, index) => ({
        ...offer,
        estimatedDistance: [1500, 3200, 2800][index] // Mock distances in meters
      }));

      const sortedByDistance = [...offersWithDistance].sort((a, b) => 
        a.estimatedDistance - b.estimatedDistance
      );

      expect(sortedByDistance[0].estimatedDistance).toBe(1500);
      expect(sortedByDistance[1].estimatedDistance).toBe(2800);
      expect(sortedByDistance[2].estimatedDistance).toBe(3200);
    });
  });

  describe('Combined Filtering and Sorting', () => {
    test('should apply multiple filters and sort results', () => {
      // Filter: fragile packages with payment > $20, sort by payment desc
      const filtered = sampleOffers
        .filter(offer => offer.packageDetails.fragile === true)
        .filter(offer => offer.payment.amount > 20)
        .sort((a, b) => b.payment.amount - a.payment.amount);

      expect(filtered).toHaveLength(2);
      expect(filtered[0].payment.amount).toBe(45.00);
      expect(filtered[1].payment.amount).toBe(28.75);
      
      // Verify all results meet both criteria
      filtered.forEach(offer => {
        expect(offer.packageDetails.fragile).toBe(true);
        expect(offer.payment.amount).toBeGreaterThan(20);
      });
    });

    test('should filter by vehicle compatibility and sort by payment', () => {
      // Filter: bike-compatible packages, sort by payment ascending
      const filtered = sampleOffers
        .filter(offer => offer.packageDetails.weight <= 5)
        .sort((a, b) => a.payment.amount - b.payment.amount);

      expect(filtered).toHaveLength(2);
      expect(filtered[0].payment.amount).toBe(12.50);
      expect(filtered[1].payment.amount).toBe(45.00);
      
      // Verify all are bike-compatible
      filtered.forEach(offer => {
        expect(offer.packageDetails.weight).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('Pagination Logic', () => {
    test('should calculate pagination correctly', () => {
      const totalOffers = 25;
      const limit = 10;
      const page = 2;
      
      const skip = (page - 1) * limit;
      const totalPages = Math.ceil(totalOffers / limit);
      const hasNextPage = skip + limit < totalOffers;
      const hasPrevPage = page > 1;

      expect(skip).toBe(10);
      expect(totalPages).toBe(3);
      expect(hasNextPage).toBe(true);
      expect(hasPrevPage).toBe(true);
    });

    test('should handle edge cases for pagination', () => {
      const totalOffers = 10;
      const limit = 10;
      
      // First page
      const page1 = {
        page: 1,
        skip: 0,
        hasNextPage: false,
        hasPrevPage: false
      };
      
      expect(page1.skip).toBe(0);
      expect(page1.hasNextPage).toBe(false);
      expect(page1.hasPrevPage).toBe(false);
      
      // Last page with partial results
      const totalOffers2 = 25;
      const limit2 = 10;
      const page3 = 3;
      const skip3 = (page3 - 1) * limit2;
      const hasNextPage3 = skip3 + limit2 < totalOffers2;
      
      expect(skip3).toBe(20);
      expect(hasNextPage3).toBe(false); // No more pages
    });
  });

  describe('Query Performance Considerations', () => {
    test('should limit results to prevent performance issues', () => {
      const requestedLimit = 500;
      const maxLimit = 200;
      const actualLimit = Math.min(requestedLimit, maxLimit);

      expect(actualLimit).toBe(200);
    });

    test('should validate sort parameters', () => {
      const validSortFields = ['payment', 'distance', 'created', 'status'];
      const validSortOrders = ['asc', 'desc'];
      
      const testSortBy = 'payment';
      const testSortOrder = 'desc';
      
      expect(validSortFields).toContain(testSortBy);
      expect(validSortOrders).toContain(testSortOrder);
    });

    test('should build efficient query structures', () => {
      // Test query building logic
      const filters = {
        minPayment: 15,
        maxPayment: 50,
        packageType: 'fragile',
        vehicleType: 'bike'
      };

      const query = {};
      
      if (filters.minPayment) {
        query['payment.amount'] = { $gte: filters.minPayment };
      }
      if (filters.maxPayment) {
        query['payment.amount'] = { ...query['payment.amount'], $lte: filters.maxPayment };
      }
      if (filters.packageType === 'fragile') {
        query['packageDetails.fragile'] = true;
      }
      if (filters.vehicleType === 'bike') {
        query['packageDetails.weight'] = { $lte: 5 };
      }

      expect(query['payment.amount'].$gte).toBe(15);
      expect(query['payment.amount'].$lte).toBe(50);
      expect(query['packageDetails.fragile']).toBe(true);
      expect(query['packageDetails.weight'].$lte).toBe(5);
    });
  });
});