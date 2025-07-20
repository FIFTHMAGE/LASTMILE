# Last Mile Delivery Platform API Documentation

## Overview

The Last Mile Delivery Platform API provides comprehensive endpoints for managing delivery operations between businesses and riders. The API supports role-based access control with separate functionality for businesses, riders, and administrators.

## Base URL

```
http://localhost:5000/api
```

## Authentication

All API endpoints (except registration and login) require authentication using JWT tokens.

### Headers

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## User Roles

- **Business**: Can create offers, manage deliveries, view earnings
- **Rider**: Can view and accept offers, update delivery status, track earnings
- **Admin**: Can manage users, view system metrics, moderate platform

## API Endpoints

### Authentication Endpoints

#### POST /auth/register
Register a new user (business or rider).

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "role": "business", // or "rider"
  "profile": {
    // Business profile
    "businessName": "Delivery Co",
    "businessAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "coordinates": [-74.006, 40.7128]
    },
    "businessPhone": "555-0123"
    
    // OR Rider profile
    "phone": "555-0123",
    "vehicleType": "bike", // "bike", "scooter", "car", "van"
    "currentLocation": {
      "type": "Point",
      "coordinates": [-74.006, 40.7128]
    }
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "business",
      "isVerified": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

#### POST /auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "business",
      "profile": { /* role-specific profile data */ }
    },
    "token": "jwt_token_here"
  }
}
```

### Business Dashboard Endpoints

#### GET /business/overview
Get comprehensive business dashboard overview.

**Headers:** `Authorization: Bearer <business_token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalOffers": 25,
      "activeOffers": 5,
      "completedOffers": 18,
      "totalSpent": 1250.50,
      "thisMonthSpent": 450.75,
      "avgDeliveryTime": 35,
      "completionRate": "92.3"
    },
    "recentOffers": [
      {
        "id": "offer_id",
        "title": "Package Delivery",
        "status": "delivered",
        "amount": 25.50,
        "pickup": "123 Main St",
        "delivery": "456 Oak Ave",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "rider": {
          "name": "Jane Smith",
          "phone": "555-0456"
        }
      }
    ],
    "monthlyTrends": [
      {
        "month": "2024-01",
        "offers": 12,
        "completed": 11,
        "totalSpent": 275.50
      }
    ]
  }
}
```

#### POST /business/offers
Create a new delivery offer.

**Headers:** `Authorization: Bearer <business_token>`

**Request Body:**
```json
{
  "title": "Package Delivery to Downtown",
  "description": "Urgent document delivery",
  "packageDetails": {
    "weight": 2.5,
    "dimensions": {
      "length": 20,
      "width": 15,
      "height": 10
    },
    "fragile": false,
    "specialInstructions": "Handle with care"
  },
  "pickup": {
    "address": "123 Main St, New York, NY 10001",
    "coordinates": [-74.006, 40.7128],
    "contactName": "John Doe",
    "contactPhone": "555-0123",
    "instructions": "Ring doorbell"
  },
  "delivery": {
    "address": "456 Oak Ave, Brooklyn, NY 11201",
    "coordinates": [-73.9857, 40.6892],
    "contactName": "Jane Smith",
    "contactPhone": "555-0456",
    "instructions": "Leave at front desk"
  },
  "payment": {
    "amount": 25.50,
    "currency": "USD",
    "paymentMethod": "card"
  },
  "estimatedDistance": 5000,
  "estimatedDuration": 30
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Offer created successfully",
  "data": {
    "offer": {
      "id": "offer_id",
      "title": "Package Delivery to Downtown",
      "status": "open",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "estimatedDistance": 5000,
      "estimatedDuration": 30
    }
  }
}
```

#### GET /business/offers
Get business offers with filtering and pagination.

**Headers:** `Authorization: Bearer <business_token>`

**Query Parameters:**
- `status` (optional): Filter by status (open, accepted, delivered, cancelled)
- `dateFrom` (optional): Filter from date (ISO string)
- `dateTo` (optional): Filter to date (ISO string)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `sortBy` (optional): Sort field (createdAt, amount, status)
- `sortOrder` (optional): Sort order (asc, desc)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "offers": [
      {
        "id": "offer_id",
        "title": "Package Delivery",
        "status": "delivered",
        "payment": {
          "amount": 25.50,
          "currency": "USD"
        },
        "pickup": {
          "address": "123 Main St",
          "contactName": "John Doe"
        },
        "delivery": {
          "address": "456 Oak Ave",
          "contactName": "Jane Smith"
        },
        "createdAt": "2024-01-01T00:00:00.000Z",
        "acceptedAt": "2024-01-01T01:00:00.000Z",
        "deliveredAt": "2024-01-01T02:30:00.000Z",
        "rider": {
          "id": "rider_id",
          "name": "Mike Wilson",
          "phone": "555-0789"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalOffers": 45,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Rider Dashboard Endpoints

#### GET /rider/overview
Get comprehensive rider dashboard overview.

**Headers:** `Authorization: Bearer <rider_token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalDeliveries": 150,
      "activeDeliveries": 2,
      "completedDeliveries": 142,
      "completionRate": "94.7",
      "totalEarnings": 3250.75,
      "thisMonthEarnings": 850.25,
      "avgRating": 4.8,
      "avgEarningsPerDelivery": "21.67"
    },
    "recentDeliveries": [
      {
        "id": "offer_id",
        "status": "delivered",
        "amount": 25.50,
        "pickup": "123 Main St",
        "delivery": "456 Oak Ave",
        "acceptedAt": "2024-01-01T00:00:00.000Z",
        "deliveredAt": "2024-01-01T01:30:00.000Z",
        "business": {
          "name": "Delivery Co",
          "phone": "555-0123"
        }
      }
    ],
    "nearbyOffers": [
      {
        "id": "offer_id",
        "title": "Package Delivery",
        "amount": 30.00,
        "pickup": "789 Pine St",
        "delivery": "321 Elm Ave",
        "estimatedDistance": 3500,
        "distanceFromRider": 1200
      }
    ]
  }
}
```

#### GET /rider/nearby-offers
Get nearby delivery offers for rider.

**Headers:** `Authorization: Bearer <rider_token>`

**Query Parameters:**
- `lat` (optional): Rider latitude
- `lng` (optional): Rider longitude
- `maxDistance` (optional): Maximum distance in meters (default: 10000)
- `minPayment` (optional): Minimum payment amount
- `maxPayment` (optional): Maximum payment amount
- `sortBy` (optional): Sort by (distance, payment, created)
- `sortOrder` (optional): Sort order (asc, desc)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "offers": [
      {
        "id": "offer_id",
        "title": "Package Delivery",
        "description": "Urgent document delivery",
        "packageDetails": {
          "weight": 2.5,
          "fragile": false
        },
        "pickup": {
          "address": "123 Main St",
          "coordinates": [-74.006, 40.7128],
          "contactName": "John Doe",
          "contactPhone": "555-0123"
        },
        "delivery": {
          "address": "456 Oak Ave",
          "coordinates": [-73.9857, 40.6892],
          "contactName": "Jane Smith",
          "contactPhone": "555-0456"
        },
        "payment": {
          "amount": 25.50,
          "currency": "USD"
        },
        "estimatedDistance": 5000,
        "estimatedDuration": 30,
        "distanceFromRider": 1200,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "business": {
          "id": "business_id",
          "name": "Delivery Co",
          "businessName": "Professional Delivery Services",
          "businessPhone": "555-0123"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalOffers": 25,
      "hasNext": true,
      "hasPrev": false
    },
    "riderLocation": {
      "coordinates": [-74.006, 40.7128],
      "maxDistance": 10000
    }
  }
}
```

#### POST /rider/offers/:offerId/accept
Accept a delivery offer.

**Headers:** `Authorization: Bearer <rider_token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Offer accepted successfully",
  "data": {
    "offer": {
      "id": "offer_id",
      "status": "accepted",
      "acceptedAt": "2024-01-01T00:00:00.000Z",
      "pickup": {
        "address": "123 Main St",
        "contactName": "John Doe",
        "contactPhone": "555-0123"
      },
      "delivery": {
        "address": "456 Oak Ave",
        "contactName": "Jane Smith",
        "contactPhone": "555-0456"
      },
      "payment": {
        "amount": 25.50,
        "currency": "USD"
      },
      "business": {
        "id": "business_id",
        "name": "Delivery Co",
        "businessPhone": "555-0123"
      }
    }
  }
}
```

#### PATCH /rider/deliveries/:offerId/status
Update delivery status.

**Headers:** `Authorization: Bearer <rider_token>`

**Request Body:**
```json
{
  "status": "picked_up", // "picked_up", "in_transit", "delivered"
  "location": {
    "type": "Point",
    "coordinates": [-74.006, 40.7128]
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Delivery status updated to picked_up",
  "data": {
    "delivery": {
      "id": "offer_id",
      "status": "picked_up",
      "pickedUpAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### PATCH /rider/availability
Update rider availability status.

**Headers:** `Authorization: Bearer <rider_token>`

**Request Body:**
```json
{
  "isAvailable": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Availability status updated to available",
  "data": {
    "isAvailable": true
  }
}
```

#### PATCH /rider/location
Update rider current location.

**Headers:** `Authorization: Bearer <rider_token>`

**Request Body:**
```json
{
  "lat": 40.7589,
  "lng": -73.9851,
  "accuracy": 10
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Location updated successfully",
  "data": {
    "location": {
      "lat": 40.7589,
      "lng": -73.9851,
      "coordinates": [-73.9851, 40.7589]
    },
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Notification Endpoints

#### GET /notifications
Get user notifications.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `isRead` (optional): Filter by read status (true/false)
- `type` (optional): Filter by notification type
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notification_id",
        "type": "offer_accepted",
        "title": "Offer Accepted",
        "message": "Your delivery offer has been accepted by a rider.",
        "read": false,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "offer": {
          "id": "offer_id",
          "pickup": "123 Main St",
          "delivery": "456 Oak Ave",
          "amount": 25.50
        },
        "data": {
          "offerId": "offer_id"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalNotifications": 45,
      "hasNext": true,
      "hasPrev": false
    },
    "unreadCount": 12
  }
}
```

#### PATCH /notifications/:notificationId/read
Mark notification as read.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "notification": {
      "id": "notification_id",
      "read": true,
      "readAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### Payment Endpoints

#### GET /payments
Get payment history.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (optional): Filter by payment status
- `dateFrom` (optional): Filter from date
- `dateTo` (optional): Filter to date
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response (200):**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "payment_id",
        "amount": 25.50,
        "platformFee": 2.55,
        "riderEarnings": 22.95,
        "currency": "USD",
        "status": "completed",
        "paymentMethod": "card",
        "processedAt": "2024-01-01T00:00:00.000Z",
        "transactionId": "txn_123456",
        "offer": {
          "id": "offer_id",
          "title": "Package Delivery",
          "pickup": "123 Main St",
          "delivery": "456 Oak Ave"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalPayments": 89,
      "hasNext": true,
      "hasPrev": false
    },
    "summary": {
      "totalAmount": 2250.75,
      "totalEarnings": 2025.68,
      "totalFees": 225.07,
      "count": 89
    }
  }
}
```

### Admin Endpoints

#### GET /admin/stats
Get platform statistics (Admin only).

**Headers:** `Authorization: Bearer <admin_token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1250,
      "businesses": 450,
      "riders": 800,
      "active": 980,
      "newThisMonth": 125
    },
    "offers": {
      "total": 5680,
      "open": 45,
      "inProgress": 123,
      "completed": 5234,
      "cancelled": 278,
      "completionRate": "92.1"
    },
    "payments": {
      "totalVolume": 125750.50,
      "thisMonth": 25680.75,
      "platformRevenue": 12575.05,
      "avgOrderValue": 22.15
    },
    "performance": {
      "avgDeliveryTime": 35,
      "avgRiderRating": 4.6,
      "avgBusinessRating": 4.4
    }
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "statusCode": 400,
    "timestamp": "2024-01-01T00:00:00.000Z",
    "details": [] // Optional validation details
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` (400): Request validation failed
- `AUTHENTICATION_ERROR` (401): Invalid or missing token
- `AUTHORIZATION_ERROR` (403): Insufficient permissions
- `NOT_FOUND_ERROR` (404): Resource not found
- `CONFLICT_ERROR` (409): Resource conflict (e.g., duplicate email)
- `RATE_LIMIT_ERROR` (429): Too many requests
- `INTERNAL_SERVER_ERROR` (500): Server error

## Rate Limiting

API endpoints are rate limited:
- General endpoints: 100 requests per 15 minutes
- Authentication endpoints: 10 requests per 15 minutes
- Location updates: 60 requests per minute

## Data Models

### User Model
```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "role": "business|rider|admin",
  "profile": {
    // Business profile
    "businessName": "string",
    "businessAddress": {
      "street": "string",
      "city": "string",
      "state": "string",
      "zipCode": "string",
      "coordinates": [longitude, latitude]
    },
    "businessPhone": "string",
    
    // Rider profile
    "phone": "string",
    "vehicleType": "bike|scooter|car|van",
    "currentLocation": {
      "type": "Point",
      "coordinates": [longitude, latitude]
    },
    "isAvailable": "boolean",
    "rating": "number"
  },
  "isVerified": "boolean",
  "createdAt": "string",
  "updatedAt": "string"
}
```

### Offer Model
```json
{
  "id": "string",
  "business": "string", // User ID
  "title": "string",
  "description": "string",
  "packageDetails": {
    "weight": "number",
    "dimensions": {
      "length": "number",
      "width": "number",
      "height": "number"
    },
    "fragile": "boolean",
    "specialInstructions": "string"
  },
  "pickup": {
    "address": "string",
    "coordinates": [longitude, latitude],
    "contactName": "string",
    "contactPhone": "string",
    "instructions": "string"
  },
  "delivery": {
    "address": "string",
    "coordinates": [longitude, latitude],
    "contactName": "string",
    "contactPhone": "string",
    "instructions": "string"
  },
  "payment": {
    "amount": "number",
    "currency": "string",
    "paymentMethod": "string"
  },
  "status": "open|accepted|picked_up|in_transit|delivered|cancelled",
  "acceptedBy": "string", // Rider ID
  "estimatedDistance": "number",
  "estimatedDuration": "number",
  "createdAt": "string",
  "acceptedAt": "string",
  "pickedUpAt": "string",
  "inTransitAt": "string",
  "deliveredAt": "string"
}
```

### Payment Model
```json
{
  "id": "string",
  "offer": "string", // Offer ID
  "business": "string", // User ID
  "rider": "string", // User ID
  "amount": "number",
  "platformFee": "number",
  "riderEarnings": "number",
  "currency": "string",
  "paymentMethod": "string",
  "status": "pending|completed|failed|refunded",
  "transactionId": "string",
  "processedAt": "string",
  "createdAt": "string"
}
```

### Notification Model
```json
{
  "id": "string",
  "user": "string", // User ID
  "offer": "string", // Offer ID (optional)
  "type": "string",
  "title": "string",
  "message": "string",
  "read": "boolean",
  "channels": ["in_app", "email", "push"],
  "data": "object", // Additional data
  "createdAt": "string",
  "readAt": "string"
}
```

## Testing

### Authentication Testing

```javascript
// Register a business user
const businessUser = await request(app)
  .post('/api/auth/register')
  .send({
    name: 'Test Business',
    email: 'business@test.com',
    password: 'password123',
    role: 'business',
    profile: {
      businessName: 'Test Delivery Co',
      businessAddress: {
        street: '123 Business St',
        city: 'Business City',
        state: 'BC',
        zipCode: '12345',
        coordinates: [-74.006, 40.7128]
      },
      businessPhone: '555-0001'
    }
  })
  .expect(201);

// Register a rider user
const riderUser = await request(app)
  .post('/api/auth/register')
  .send({
    name: 'Test Rider',
    email: 'rider@test.com',
    password: 'password123',
    role: 'rider',
    profile: {
      phone: '555-0002',
      vehicleType: 'bike',
      currentLocation: {
        type: 'Point',
        coordinates: [-74.006, 40.7128]
      }
    }
  })
  .expect(201);

// Login and get token
const loginResponse = await request(app)
  .post('/api/auth/login')
  .send({
    email: 'business@test.com',
    password: 'password123'
  })
  .expect(200);

const token = loginResponse.body.data.token;
```

### API Endpoint Testing

```javascript
// Test creating an offer
const offerResponse = await request(app)
  .post('/api/business/offers')
  .set('Authorization', `Bearer ${token}`)
  .send({
    title: 'Test Delivery',
    description: 'Test package delivery',
    packageDetails: {
      weight: 2.5,
      dimensions: {
        length: 20,
        width: 15,
        height: 10
      },
      fragile: false,
      specialInstructions: 'Handle with care'
    },
    pickup: {
      address: '123 Test St, New York, NY 10001',
      coordinates: [-74.006, 40.7128],
      contactName: 'John Doe',
      contactPhone: '555-0123',
      instructions: 'Ring doorbell'
    },
    delivery: {
      address: '456 Test Ave, Brooklyn, NY 11201',
      coordinates: [-73.9857, 40.6892],
      contactName: 'Jane Smith',
      contactPhone: '555-0456',
      instructions: 'Leave at front desk'
    },
    payment: {
      amount: 25.50,
      currency: 'USD',
      paymentMethod: 'card'
    }
  })
  .expect(201);

// Test rider accepting offer
const acceptResponse = await request(app)
  .post(`/api/rider/offers/${offerResponse.body.data.offer.id}/accept`)
  .set('Authorization', `Bearer ${riderToken}`)
  .expect(200);

// Test updating delivery status
const statusResponse = await request(app)
  .patch(`/api/rider/deliveries/${offerResponse.body.data.offer.id}/status`)
  .set('Authorization', `Bearer ${riderToken}`)
  .send({
    status: 'picked_up',
    location: {
      type: 'Point',
      coordinates: [-74.006, 40.7128]
    }
  })
  .expect(200);
```

### Integration Testing Examples

```javascript
describe('Complete Delivery Workflow', () => {
  let businessToken, riderToken, offerId;

  beforeEach(async () => {
    // Setup test users and tokens
    const businessResponse = await registerUser('business');
    const riderResponse = await registerUser('rider');
    businessToken = businessResponse.token;
    riderToken = riderResponse.token;
  });

  it('should complete full delivery lifecycle', async () => {
    // 1. Business creates offer
    const offerResponse = await request(app)
      .post('/api/business/offers')
      .set('Authorization', `Bearer ${businessToken}`)
      .send(validOfferData)
      .expect(201);

    offerId = offerResponse.body.data.offer.id;

    // 2. Rider finds nearby offers
    const nearbyResponse = await request(app)
      .get('/api/rider/nearby-offers')
      .set('Authorization', `Bearer ${riderToken}`)
      .query({ lat: 40.7128, lng: -74.006, maxDistance: 10000 })
      .expect(200);

    expect(nearbyResponse.body.data.offers).toContainEqual(
      expect.objectContaining({ id: offerId })
    );

    // 3. Rider accepts offer
    await request(app)
      .post(`/api/rider/offers/${offerId}/accept`)
      .set('Authorization', `Bearer ${riderToken}`)
      .expect(200);

    // 4. Update delivery status through completion
    const statuses = ['picked_up', 'in_transit', 'delivered'];
    for (const status of statuses) {
      await request(app)
        .patch(`/api/rider/deliveries/${offerId}/status`)
        .set('Authorization', `Bearer ${riderToken}`)
        .send({ status })
        .expect(200);
    }

    // 5. Verify final offer status
    const finalOfferResponse = await request(app)
      .get('/api/business/offers')
      .set('Authorization', `Bearer ${businessToken}`)
      .query({ status: 'delivered' })
      .expect(200);

    expect(finalOfferResponse.body.data.offers).toContainEqual(
      expect.objectContaining({ 
        id: offerId, 
        status: 'delivered' 
      })
    );
  });
});
```

## SDK Examples

### JavaScript/Node.js

```javascript
class DeliveryAPI {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async request(method, endpoint, data = null) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: data ? JSON.stringify(data) : null
    });

    return response.json();
  }

  // Business methods
  async createOffer(offerData) {
    return this.request('POST', '/business/offers', offerData);
  }

  async getOffers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/business/offers?${query}`);
  }

  // Rider methods
  async getNearbyOffers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/rider/nearby-offers?${query}`);
  }

  async acceptOffer(offerId) {
    return this.request('POST', `/rider/offers/${offerId}/accept`);
  }

  async updateDeliveryStatus(offerId, status, location = null) {
    return this.request('PATCH', `/rider/deliveries/${offerId}/status`, {
      status,
      location
    });
  }
}

// Usage
const api = new DeliveryAPI('http://localhost:5000/api', 'your_jwt_token');

// Create an offer
const offer = await api.createOffer({
  title: 'Package Delivery',
  pickup: { /* pickup details */ },
  delivery: { /* delivery details */ },
  payment: { amount: 25.50, currency: 'USD', paymentMethod: 'card' }
});
```

### Python

```python
import requests

class DeliveryAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.token = token
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}'
        }

    def request(self, method, endpoint, data=None):
        url = f"{self.base_url}{endpoint}"
        response = requests.request(method, url, json=data, headers=self.headers)
        return response.json()

    def create_offer(self, offer_data):
        return self.request('POST', '/business/offers', offer_data)

    def get_nearby_offers(self, **params):
        query = '&'.join([f"{k}={v}" for k, v in params.items()])
        return self.request('GET', f'/rider/nearby-offers?{query}')

# Usage
api = DeliveryAPI('http://localhost:5000/api', 'your_jwt_token')
offers = api.get_nearby_offers(lat=40.7128, lng=-74.006, maxDistance=5000)
```

## Webhooks

The platform supports webhooks for real-time event notifications:

### Webhook Events

- `offer.created` - New offer created
- `offer.accepted` - Offer accepted by rider
- `offer.status_updated` - Delivery status changed
- `payment.completed` - Payment processed
- `user.registered` - New user registered

### Webhook Payload

```json
{
  "event": "offer.accepted",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "offer": { /* offer object */ },
    "rider": { /* rider object */ },
    "business": { /* business object */ }
  }
}
```

## Changelog

### Version 1.0.0 (2024-01-01)
- Initial API release
- User authentication and registration
- Offer management for businesses
- Rider dashboard and offer acceptance
- Payment processing
- Notification system
- Admin dashboard

## OpenAPI Specification

The API follows OpenAPI 3.0 specification. You can find the complete schema definition in `docs/api-schema.json`.

### Validation

All API requests are validated against the JSON Schema definitions. Invalid requests will return a `400 Bad Request` with detailed validation errors.

### Example Validation Error Response

```json
{
  "success": false,
  "error": {
    "message": "Request validation failed",
    "code": "VALIDATION_ERROR",
    "statusCode": 400,
    "timestamp": "2024-01-01T00:00:00.000Z",
    "details": [
      {
        "field": "email",
        "message": "Please provide a valid email address",
        "value": "invalid-email"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters long",
        "value": "123"
      }
    ]
  }
}
```

## Testing

### Postman Collection

Import the Postman collection from `docs/postman-collection.json` to test all API endpoints with pre-configured requests and automated tests.

### Test Environment Setup

1. Import the collection into Postman
2. Set the `base_url` variable to your API endpoint
3. Run the "Authentication" folder first to get tokens
4. Use the generated tokens for other requests

### Automated Testing

The collection includes automated tests that:
- Verify response status codes
- Validate response structure
- Extract and store tokens/IDs for subsequent requests
- Check response times and content types

## API Versioning

The API uses URL-based versioning:
- Current version: `v1` (default, no version prefix required)
- Future versions: `/api/v2/...`

### Version Compatibility

- Breaking changes will increment the major version
- New features will be added to the current version
- Deprecated endpoints will be marked and supported for at least 6 months

## Security

### Authentication Security

- JWT tokens expire after 24 hours
- Tokens include user role and permissions
- Failed login attempts are rate limited
- Passwords are hashed using bcrypt

### API Security

- All endpoints use HTTPS in production
- Request/response data is validated and sanitized
- Rate limiting prevents abuse
- CORS is configured for allowed origins

### Data Privacy

- Personal data is encrypted at rest
- Location data is anonymized after delivery completion
- Payment information is tokenized
- User data can be deleted upon request

## Monitoring and Analytics

### API Metrics

The platform tracks:
- Request/response times
- Error rates by endpoint
- Authentication success/failure rates
- Rate limit violations
- Geographic distribution of requests

### Health Checks

```bash
# API Health Check
GET /api/health

# Response
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "uptime": 86400,
  "database": "connected",
  "cache": "connected"
}
```

## Support and Documentation

### Getting Help

- **API Documentation**: This document and schema files
- **Testing Guide**: `docs/TESTING.md`
- **Postman Collection**: `docs/postman-collection.json`
- **Issue Tracking**: GitHub Issues
- **Community**: Developer Discord/Slack

### Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Update documentation
5. Submit a pull request

### Changelog

See `CHANGELOG.md` for version history and breaking changes.

---

**Last Updated**: January 2024  
**API Version**: 1.0.0  
**Documentation Version**: 1.0.0

For additional support or questions, please contact the development team or refer to the platform documentation.