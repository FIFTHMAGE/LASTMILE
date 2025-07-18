const User = require('../models/User');

describe('User Model', () => {
  describe('Business User', () => {
    test('should create a business user with complete profile', () => {
      const businessData = {
        name: 'John Doe',
        email: 'john@business.com',
        password: 'hashedpassword123',
        role: 'business',
        profile: {
          businessName: 'Quick Delivery Co',
          businessAddress: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            coordinates: [-74.006, 40.7128]
          },
          businessPhone: '+1-555-0123'
        }
      };

      const user = new User(businessData);

      expect(user.name).toBe('John Doe');
      expect(user.role).toBe('business');
      expect(user.profile.businessName).toBe('Quick Delivery Co');
      expect(user.profile.businessAddress.city).toBe('New York');
      expect(user.isVerified).toBe(false);
    });

    test('should validate business profile correctly', () => {
      const user = new User({
        name: 'Jane Doe',
        email: 'jane@business.com',
        password: 'hashedpassword123',
        role: 'business',
        profile: {
          businessName: 'Fast Delivery',
          businessAddress: {
            street: '456 Oak Ave',
            city: 'Los Angeles',
            state: 'CA',
            zipCode: '90210'
          },
          businessPhone: '+1-555-0456'
        }
      });

      const errors = user.validateProfile();
      expect(errors).toHaveLength(0);
    });

    test('should return validation errors for incomplete business profile', () => {
      const user = new User({
        name: 'Bob Smith',
        email: 'bob@business.com',
        password: 'hashedpassword123',
        role: 'business',
        profile: {
          businessName: 'Incomplete Business'
          // Missing required fields
        }
      });

      const errors = user.validateProfile();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('Business street address is required');
      expect(errors).toContain('Business phone is required');
    });

    test('should return correct profile data for business', () => {
      const user = new User({
        name: 'Alice Johnson',
        email: 'alice@business.com',
        password: 'hashedpassword123',
        role: 'business',
        profile: {
          businessName: 'Express Delivery',
          businessAddress: {
            street: '789 Pine St',
            city: 'Chicago',
            state: 'IL',
            zipCode: '60601'
          },
          businessPhone: '+1-555-0789'
        }
      });

      const profileData = user.getProfileData();
      expect(profileData.role).toBe('business');
      expect(profileData.businessName).toBe('Express Delivery');
      expect(profileData.businessPhone).toBe('+1-555-0789');
      expect(profileData.phone).toBeUndefined(); // Should not include rider fields
    });
  });

  describe('Rider User', () => {
    test('should create a rider user with complete profile', () => {
      const riderData = {
        name: 'Mike Wilson',
        email: 'mike@rider.com',
        password: 'hashedpassword123',
        role: 'rider',
        profile: {
          phone: '+1-555-1234',
          vehicleType: 'bike',
          currentLocation: {
            type: 'Point',
            coordinates: [-74.006, 40.7128]
          },
          isAvailable: true,
          rating: 4.8,
          completedDeliveries: 25
        }
      };

      const user = new User(riderData);

      expect(user.name).toBe('Mike Wilson');
      expect(user.role).toBe('rider');
      expect(user.profile.vehicleType).toBe('bike');
      expect(user.profile.rating).toBe(4.8);
      expect(user.profile.completedDeliveries).toBe(25);
    });

    test('should validate rider profile correctly', () => {
      const user = new User({
        name: 'Sarah Davis',
        email: 'sarah@rider.com',
        password: 'hashedpassword123',
        role: 'rider',
        profile: {
          phone: '+1-555-5678',
          vehicleType: 'scooter',
          isAvailable: true
        }
      });

      const errors = user.validateProfile();
      expect(errors).toHaveLength(0);
    });

    test('should return validation errors for incomplete rider profile', () => {
      const user = new User({
        name: 'Tom Brown',
        email: 'tom@rider.com',
        password: 'hashedpassword123',
        role: 'rider',
        profile: {
          // Missing required fields
        }
      });

      const errors = user.validateProfile();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('Phone number is required');
      expect(errors).toContain('Vehicle type is required');
    });

    test('should return correct profile data for rider', () => {
      const user = new User({
        name: 'Lisa Garcia',
        email: 'lisa@rider.com',
        password: 'hashedpassword123',
        role: 'rider',
        profile: {
          phone: '+1-555-9876',
          vehicleType: 'car',
          isAvailable: false,
          rating: 4.9,
          completedDeliveries: 50
        }
      });

      const profileData = user.getProfileData();
      expect(profileData.role).toBe('rider');
      expect(profileData.phone).toBe('+1-555-9876');
      expect(profileData.vehicleType).toBe('car');
      expect(profileData.rating).toBe(4.9);
      expect(profileData.businessName).toBeUndefined(); // Should not include business fields
    });

    test('should set default values for rider fields', () => {
      const user = new User({
        name: 'David Lee',
        email: 'david@rider.com',
        password: 'hashedpassword123',
        role: 'rider',
        profile: {
          phone: '+1-555-4321',
          vehicleType: 'van'
        }
      });

      expect(user.profile.isAvailable).toBe(true);
      expect(user.profile.rating).toBe(5.0);
      expect(user.profile.completedDeliveries).toBe(0);
    });
  });
});