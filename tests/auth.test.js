const request = require('supertest');
const app = require('../server');
const User = require('../models/User');

describe('Auth Routes', () => {
  beforeEach(async () => {
    // Clear users before each test (in a real app, you'd use a test database)
    await User.deleteMany({});
  });

  describe('POST /api/auth/register/business', () => {
    test('should register a business with complete profile', async () => {
      const businessData = {
        name: 'John Doe',
        email: 'john@business.com',
        password: 'password123',
        businessName: 'Quick Delivery Co',
        businessAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          coordinates: [-74.006, 40.7128]
        },
        businessPhone: '+1-555-0123'
      };

      const response = await request(app)
        .post('/api/auth/register/business')
        .send(businessData)
        .expect(201);

      expect(response.body.message).toBe('Business registered successfully');
      expect(response.body.user.role).toBe('business');
      expect(response.body.user.businessName).toBe('Quick Delivery Co');
      expect(response.body.user.businessPhone).toBe('+1-555-0123');
    });

    test('should return error for missing required fields', async () => {
      const incompleteData = {
        name: 'John Doe',
        email: 'john@business.com',
        password: 'password123'
        // Missing businessName, businessAddress, businessPhone
      };

      const response = await request(app)
        .post('/api/auth/register/business')
        .send(incompleteData)
        .expect(400);

      expect(response.body.message).toBe('All fields are required');
      expect(response.body.required).toContain('businessName');
      expect(response.body.required).toContain('businessAddress');
      expect(response.body.required).toContain('businessPhone');
    });

    test('should return error for incomplete business address', async () => {
      const incompleteAddressData = {
        name: 'John Doe',
        email: 'john@business.com',
        password: 'password123',
        businessName: 'Quick Delivery Co',
        businessAddress: {
          street: '123 Main St'
          // Missing city, state, zipCode
        },
        businessPhone: '+1-555-0123'
      };

      const response = await request(app)
        .post('/api/auth/register/business')
        .send(incompleteAddressData)
        .expect(400);

      expect(response.body.message).toBe('Complete business address is required');
      expect(response.body.required).toContain('city');
      expect(response.body.required).toContain('state');
      expect(response.body.required).toContain('zipCode');
    });

    test('should return error for duplicate email', async () => {
      const businessData = {
        name: 'John Doe',
        email: 'john@business.com',
        password: 'password123',
        businessName: 'Quick Delivery Co',
        businessAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001'
        },
        businessPhone: '+1-555-0123'
      };

      // Register first business
      await request(app)
        .post('/api/auth/register/business')
        .send(businessData)
        .expect(201);

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register/business')
        .send({ ...businessData, businessName: 'Another Business' })
        .expect(400);

      expect(response.body.message).toBe('Email already in use');
    });
  });

  describe('POST /api/auth/register/rider', () => {
    test('should register a rider with complete profile', async () => {
      const riderData = {
        name: 'Mike Wilson',
        email: 'mike@rider.com',
        password: 'password123',
        phone: '+1-555-1234',
        vehicleType: 'bike',
        currentLocation: {
          type: 'Point',
          coordinates: [-74.006, 40.7128]
        }
      };

      const response = await request(app)
        .post('/api/auth/register/rider')
        .send(riderData)
        .expect(201);

      expect(response.body.message).toBe('Rider registered successfully');
      expect(response.body.user.role).toBe('rider');
      expect(response.body.user.phone).toBe('+1-555-1234');
      expect(response.body.user.vehicleType).toBe('bike');
      expect(response.body.user.isAvailable).toBe(true);
      expect(response.body.user.rating).toBe(5.0);
      expect(response.body.user.completedDeliveries).toBe(0);
    });

    test('should return error for missing required fields', async () => {
      const incompleteData = {
        name: 'Mike Wilson',
        email: 'mike@rider.com',
        password: 'password123'
        // Missing phone, vehicleType
      };

      const response = await request(app)
        .post('/api/auth/register/rider')
        .send(incompleteData)
        .expect(400);

      expect(response.body.message).toBe('All fields are required');
      expect(response.body.required).toContain('phone');
      expect(response.body.required).toContain('vehicleType');
    });

    test('should return error for invalid vehicle type', async () => {
      const invalidVehicleData = {
        name: 'Mike Wilson',
        email: 'mike@rider.com',
        password: 'password123',
        phone: '+1-555-1234',
        vehicleType: 'helicopter' // Invalid vehicle type
      };

      const response = await request(app)
        .post('/api/auth/register/rider')
        .send(invalidVehicleData)
        .expect(400);

      expect(response.body.message).toBe('Invalid vehicle type');
      expect(response.body.validTypes).toEqual(['bike', 'scooter', 'car', 'van']);
    });

    test('should register rider without location (optional field)', async () => {
      const riderData = {
        name: 'Sarah Davis',
        email: 'sarah@rider.com',
        password: 'password123',
        phone: '+1-555-5678',
        vehicleType: 'scooter'
        // No currentLocation provided
      };

      const response = await request(app)
        .post('/api/auth/register/rider')
        .send(riderData)
        .expect(201);

      expect(response.body.message).toBe('Rider registered successfully');
      expect(response.body.user.role).toBe('rider');
      expect(response.body.user.vehicleType).toBe('scooter');
    });
  });

  describe('POST /api/auth/register (backward compatibility)', () => {
    test('should provide guidance for complete registration', async () => {
      const basicData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'business'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(basicData)
        .expect(201);

      expect(response.body.message).toBe('Basic user registered. Please complete your profile.');
      expect(response.body.nextStep).toBe('Complete your profile at /api/auth/register/business');
      expect(response.body.endpoints.business).toBe('/api/auth/register/business');
      expect(response.body.endpoints.rider).toBe('/api/auth/register/rider');
    });

    test('should return error for missing fields', async () => {
      const incompleteData = {
        name: 'Test User',
        email: 'test@example.com'
        // Missing password and role
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteData)
        .expect(400);

      expect(response.body.message).toContain('All fields are required');
      expect(response.body.endpoints.business).toBe('/api/auth/register/business');
      expect(response.body.endpoints.rider).toBe('/api/auth/register/rider');
    });
  });

  describe('POST /api/auth/login', () => {
    test('should login business user successfully', async () => {
      // First register a business
      const businessData = {
        name: 'John Doe',
        email: 'john@business.com',
        password: 'password123',
        businessName: 'Quick Delivery Co',
        businessAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001'
        },
        businessPhone: '+1-555-0123'
      };

      await request(app)
        .post('/api/auth/register/business')
        .send(businessData)
        .expect(201);

      // Then login
      const loginData = {
        email: 'john@business.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('john@business.com');
      expect(response.body.user.role).toBe('business');
    });

    test('should login rider user successfully', async () => {
      // First register a rider
      const riderData = {
        name: 'Mike Wilson',
        email: 'mike@rider.com',
        password: 'password123',
        phone: '+1-555-1234',
        vehicleType: 'bike'
      };

      await request(app)
        .post('/api/auth/register/rider')
        .send(riderData)
        .expect(201);

      // Then login
      const loginData = {
        email: 'mike@rider.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('mike@rider.com');
      expect(response.body.user.role).toBe('rider');
    });

    test('should return error for invalid credentials', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.message).toBe('Invalid credentials');
    });
  });
});