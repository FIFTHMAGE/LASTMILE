const request = require('supertest');
const express = require('express');
const {
  handleValidationErrors,
  validationRules,
  sanitizeInput,
  validateFileUpload,
  customValidators
} = require('../middleware/validation');
const { ErrorHandler } = require('../middleware/errorHandler');

describe('Validation Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(sanitizeInput);
  });

  describe('User Registration Validation', () => {
    beforeEach(() => {
      app.post('/register', 
        validationRules.userRegistration,
        handleValidationErrors,
        (req, res) => res.json({ success: true })
      );
      app.use(new ErrorHandler().handle());
    });

    test('should accept valid user registration data', async () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123',
        role: 'rider'
      };

      const response = await request(app)
        .post('/register')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid name', async () => {
      const invalidData = {
        name: 'J', // Too short
        email: 'john@example.com',
        password: 'Password123',
        role: 'rider'
      };

      const response = await request(app)
        .post('/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            message: 'Name must be between 2 and 50 characters'
          })
        ])
      );
    });

    test('should reject invalid email', async () => {
      const invalidData = {
        name: 'John Doe',
        email: 'invalid-email',
        password: 'Password123',
        role: 'rider'
      };

      const response = await request(app)
        .post('/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: 'Please provide a valid email address'
          })
        ])
      );
    });

    test('should reject weak password', async () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'weak', // Too weak
        role: 'rider'
      };

      const response = await request(app)
        .post('/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'password'
          })
        ])
      );
    });

    test('should reject invalid role', async () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123',
        role: 'invalid-role'
      };

      const response = await request(app)
        .post('/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'role',
            message: 'Role must be either business or rider'
          })
        ])
      );
    });

    test('should handle multiple validation errors', async () => {
      const invalidData = {
        name: '', // Empty
        email: 'invalid-email',
        password: '123', // Too weak
        role: 'invalid'
      };

      const response = await request(app)
        .post('/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.details).toHaveLength(4);
    });
  });

  describe('Business Profile Validation', () => {
    beforeEach(() => {
      app.post('/business-profile',
        validationRules.businessProfile,
        handleValidationErrors,
        (req, res) => res.json({ success: true })
      );
      app.use(new ErrorHandler().handle());
    });

    test('should accept valid business profile', async () => {
      const validData = {
        profile: {
          businessName: 'Test Business Inc',
          businessAddress: {
            street: '123 Business Street',
            city: 'Business City',
            state: 'California',
            zipCode: '90210'
          },
          businessPhone: '+1-555-123-4567'
        }
      };

      const response = await request(app)
        .post('/business-profile')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid ZIP code', async () => {
      const invalidData = {
        profile: {
          businessName: 'Test Business Inc',
          businessAddress: {
            street: '123 Business Street',
            city: 'Business City',
            state: 'California',
            zipCode: 'invalid-zip'
          },
          businessPhone: '+1-555-123-4567'
        }
      };

      const response = await request(app)
        .post('/business-profile')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'profile.businessAddress.zipCode',
            message: 'Please provide a valid ZIP code'
          })
        ])
      );
    });

    test('should reject invalid phone number', async () => {
      const invalidData = {
        profile: {
          businessName: 'Test Business Inc',
          businessAddress: {
            street: '123 Business Street',
            city: 'Business City',
            state: 'California',
            zipCode: '90210'
          },
          businessPhone: 'invalid-phone'
        }
      };

      const response = await request(app)
        .post('/business-profile')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'profile.businessPhone',
            message: 'Please provide a valid phone number'
          })
        ])
      );
    });
  });

  describe('Offer Creation Validation', () => {
    beforeEach(() => {
      app.post('/offers',
        validationRules.offerCreation,
        handleValidationErrors,
        (req, res) => res.json({ success: true })
      );
      app.use(new ErrorHandler().handle());
    });

    test('should accept valid offer data', async () => {
      const validData = {
        title: 'Delivery from A to B',
        description: 'Package delivery service',
        pickup: {
          address: '123 Pickup Street, City, State',
          coordinates: [-74.006, 40.7128],
          contactName: 'John Pickup',
          contactPhone: '+1-555-123-4567'
        },
        delivery: {
          address: '456 Delivery Avenue, City, State',
          coordinates: [-74.0059, 40.7127],
          contactName: 'Jane Delivery',
          contactPhone: '+1-555-987-6543'
        },
        payment: {
          amount: 25.50,
          currency: 'USD',
          paymentMethod: 'card'
        },
        packageDetails: {
          weight: 2.5,
          fragile: true
        }
      };

      const response = await request(app)
        .post('/offers')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid coordinates', async () => {
      const invalidData = {
        title: 'Delivery from A to B',
        pickup: {
          address: '123 Pickup Street, City, State',
          coordinates: [-200, 40.7128], // Invalid longitude
          contactName: 'John Pickup',
          contactPhone: '+1-555-123-4567'
        },
        delivery: {
          address: '456 Delivery Avenue, City, State',
          coordinates: [-74.0059, 100], // Invalid latitude
          contactName: 'Jane Delivery',
          contactPhone: '+1-555-987-6543'
        },
        payment: {
          amount: 25.50,
          paymentMethod: 'card'
        }
      };

      const response = await request(app)
        .post('/offers')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.details.length).toBeGreaterThan(0);
    });

    test('should reject invalid payment amount', async () => {
      const invalidData = {
        title: 'Delivery from A to B',
        pickup: {
          address: '123 Pickup Street, City, State',
          coordinates: [-74.006, 40.7128],
          contactName: 'John Pickup',
          contactPhone: '+1-555-123-4567'
        },
        delivery: {
          address: '456 Delivery Avenue, City, State',
          coordinates: [-74.0059, 40.7127],
          contactName: 'Jane Delivery',
          contactPhone: '+1-555-987-6543'
        },
        payment: {
          amount: 0, // Invalid amount
          paymentMethod: 'card'
        }
      };

      const response = await request(app)
        .post('/offers')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'payment.amount',
            message: 'Payment amount must be between $1 and $10,000'
          })
        ])
      );
    });
  });

  describe('Location Update Validation', () => {
    beforeEach(() => {
      app.post('/location',
        validationRules.locationUpdate,
        handleValidationErrors,
        (req, res) => res.json({ success: true })
      );
      app.use(new ErrorHandler().handle());
    });

    test('should accept valid location data', async () => {
      const validData = {
        coordinates: [-74.006, 40.7128],
        accuracy: 10,
        heading: 90,
        speed: 15
      };

      const response = await request(app)
        .post('/location')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid coordinates format', async () => {
      const invalidData = {
        coordinates: [-74.006], // Missing latitude
        accuracy: 10
      };

      const response = await request(app)
        .post('/location')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'coordinates',
            message: 'Coordinates must be an array of [longitude, latitude]'
          })
        ])
      );
    });

    test('should reject invalid heading', async () => {
      const invalidData = {
        coordinates: [-74.006, 40.7128],
        heading: 400 // Invalid heading (> 360)
      };

      const response = await request(app)
        .post('/location')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'heading',
            message: 'Heading must be between 0 and 360 degrees'
          })
        ])
      );
    });
  });

  describe('Delivery Event Validation', () => {
    beforeEach(() => {
      app.post('/delivery-event',
        validationRules.deliveryEvent,
        handleValidationErrors,
        (req, res) => res.json({ success: true })
      );
      app.use(new ErrorHandler().handle());
    });

    test('should accept valid delivery event', async () => {
      const validData = {
        eventType: 'package_picked_up',
        notes: 'Package successfully picked up from customer',
        location: {
          coordinates: [-74.006, 40.7128]
        }
      };

      const response = await request(app)
        .post('/delivery-event')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid event type', async () => {
      const invalidData = {
        eventType: 'invalid_event_type',
        notes: 'Test notes'
      };

      const response = await request(app)
        .post('/delivery-event')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'eventType',
            message: 'Invalid event type'
          })
        ])
      );
    });

    test('should reject notes that are too long', async () => {
      const invalidData = {
        eventType: 'package_picked_up',
        notes: 'A'.repeat(501) // Too long
      };

      const response = await request(app)
        .post('/delivery-event')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'notes',
            message: 'Notes cannot exceed 500 characters'
          })
        ])
      );
    });
  });

  describe('Issue Report Validation', () => {
    beforeEach(() => {
      app.post('/issue',
        validationRules.issueReport,
        handleValidationErrors,
        (req, res) => res.json({ success: true })
      );
      app.use(new ErrorHandler().handle());
    });

    test('should accept valid issue report', async () => {
      const validData = {
        type: 'traffic_delay',
        description: 'Heavy traffic on main highway causing significant delay',
        impactOnDelivery: 'minor_delay'
      };

      const response = await request(app)
        .post('/issue')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid issue type', async () => {
      const invalidData = {
        type: 'invalid_issue_type',
        description: 'Test description'
      };

      const response = await request(app)
        .post('/issue')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'type',
            message: 'Invalid issue type'
          })
        ])
      );
    });

    test('should reject description that is too short', async () => {
      const invalidData = {
        type: 'traffic_delay',
        description: 'Short' // Too short
      };

      const response = await request(app)
        .post('/issue')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'description',
            message: 'Description must be between 10 and 500 characters'
          })
        ])
      );
    });
  });

  describe('Sanitization Middleware', () => {
    test('should sanitize XSS attempts', async () => {
      app.post('/test-sanitize', (req, res) => {
        res.json({ body: req.body, query: req.query });
      });

      const maliciousData = {
        name: 'John<script>alert("xss")</script>Doe',
        description: 'Test<script>malicious()</script>content'
      };

      const response = await request(app)
        .post('/test-sanitize?search=<script>alert("xss")</script>')
        .send(maliciousData);

      expect(response.status).toBe(200);
      expect(response.body.body.name).toBe('JohnDoe');
      expect(response.body.body.description).toBe('Testcontent');
      expect(response.body.query.search).toBe('');
    });

    test('should handle nested objects', async () => {
      app.post('/test-nested', (req, res) => {
        res.json({ body: req.body });
      });

      const nestedData = {
        user: {
          profile: {
            bio: 'Hello<script>alert("xss")</script>World'
          }
        }
      };

      const response = await request(app)
        .post('/test-nested')
        .send(nestedData);

      expect(response.status).toBe(200);
      expect(response.body.body.user.profile.bio).toBe('HelloWorld');
    });
  });

  describe('Custom Validators', () => {
    test('isValidCoordinates should validate coordinate arrays', () => {
      expect(customValidators.isValidCoordinates([-74.006, 40.7128])).toBe(true);
      expect(customValidators.isValidCoordinates([-180, -90])).toBe(true);
      expect(customValidators.isValidCoordinates([180, 90])).toBe(true);
      
      expect(customValidators.isValidCoordinates([-181, 40.7128])).toBe(false);
      expect(customValidators.isValidCoordinates([-74.006, 91])).toBe(false);
      expect(customValidators.isValidCoordinates([-74.006])).toBe(false);
      expect(customValidators.isValidCoordinates('invalid')).toBe(false);
    });

    test('isValidPhone should validate phone numbers', () => {
      expect(customValidators.isValidPhone('+1-555-123-4567')).toBe(true);
      expect(customValidators.isValidPhone('555-123-4567')).toBe(true);
      expect(customValidators.isValidPhone('(555) 123-4567')).toBe(true);
      expect(customValidators.isValidPhone('5551234567')).toBe(true);
      
      expect(customValidators.isValidPhone('123')).toBe(false);
      expect(customValidators.isValidPhone('invalid-phone')).toBe(false);
      expect(customValidators.isValidPhone('')).toBe(false);
    });

    test('isStrongPassword should validate password strength', () => {
      expect(customValidators.isStrongPassword('Password123!')).toBe(true);
      expect(customValidators.isStrongPassword('MyStr0ng@Pass')).toBe(true);
      
      expect(customValidators.isStrongPassword('password')).toBe(false); // No uppercase, number, special
      expect(customValidators.isStrongPassword('PASSWORD')).toBe(false); // No lowercase, number, special
      expect(customValidators.isStrongPassword('Password')).toBe(false); // No number, special
      expect(customValidators.isStrongPassword('Pass123')).toBe(false); // Too short, no special
    });

    test('isValidBusinessHours should validate business hours format', () => {
      const validHours = {
        monday: { open: '09:00', close: '17:00' },
        tuesday: { open: '09:00', close: '17:00' },
        wednesday: { open: '09:00', close: '17:00' }
      };
      
      expect(customValidators.isValidBusinessHours(validHours)).toBe(true);
      
      const invalidHours1 = {
        monday: { open: '25:00', close: '17:00' } // Invalid hour
      };
      
      expect(customValidators.isValidBusinessHours(invalidHours1)).toBe(false);
      
      const invalidHours2 = {
        monday: { open: '09:00' } // Missing close
      };
      
      expect(customValidators.isValidBusinessHours(invalidHours2)).toBe(false);
      
      expect(customValidators.isValidBusinessHours(null)).toBe(false);
      expect(customValidators.isValidBusinessHours('invalid')).toBe(false);
    });
  });

  describe('Pagination Validation', () => {
    beforeEach(() => {
      app.get('/paginated',
        validationRules.pagination,
        handleValidationErrors,
        (req, res) => res.json({ success: true })
      );
      app.use(new ErrorHandler().handle());
    });

    test('should accept valid pagination parameters', async () => {
      const response = await request(app)
        .get('/paginated?page=2&limit=20&sortBy=name&sortOrder=desc');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid page number', async () => {
      const response = await request(app)
        .get('/paginated?page=0');

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'page',
            message: 'Page must be a positive integer'
          })
        ])
      );
    });

    test('should reject limit that is too high', async () => {
      const response = await request(app)
        .get('/paginated?limit=200');

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'limit',
            message: 'Limit must be between 1 and 100'
          })
        ])
      );
    });

    test('should reject invalid sort order', async () => {
      const response = await request(app)
        .get('/paginated?sortOrder=invalid');

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'sortOrder',
            message: 'Sort order must be asc or desc'
          })
        ])
      );
    });
  });
});