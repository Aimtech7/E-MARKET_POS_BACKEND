const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');

describe('App Endpoints', () => {
  beforeAll(async () => {
    // We do not connect to a real DB here if we don't want to mess up data.
    // For a simple integration test, we can just check if routes are mounted and return 401 unauth.
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should return 404 for root', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(404);
  });

  it('should return 401 for protected products route without auth', async () => {
    const res = await request(app).get('/product/products');
    expect(res.statusCode).toEqual(401);
  });
});
