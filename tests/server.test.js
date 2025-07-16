const request = require('supertest');
const app = require('../server');

describe('GET /', () => {
  it('should return Last Mile API is running', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('Last Mile API is running');
  });
}); 