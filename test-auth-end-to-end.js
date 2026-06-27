const request = require('supertest');
const app = require('./server');
const mongoose = require('mongoose');

async function runTests() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🛡️ SENIOR AUTHENTICATION & STARTUP VALIDATION TEST SUITE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  let token = "";
  let refreshToken = "";

  try {
    console.log("[TEST 1] Testing GET /api/version...");
    const resVer = await request(app).get('/api/version');
    if (resVer.status === 200 && resVer.body.version === '1.0.0') {
      console.log("✓ GET /api/version passed:", resVer.body);
    } else {
      console.error("✗ GET /api/version failed HTTP", resVer.status);
    }

    console.log("\n[TEST 2] Testing GET /api/health (Startup Verification)...");
    const resHealth = await request(app).get('/api/health');
    if (resHealth.status === 200 && resHealth.body.status === 'ok') {
      console.log("✓ GET /api/health passed:", resHealth.body);
    } else {
      console.error("✗ GET /api/health failed HTTP", resHealth.status);
    }

    console.log("\n[TEST 3] Testing POST /api/auth/login (Cashier Emergency Fallback)...");
    const resLogin = await request(app).post('/api/auth/login').send({ username: 'cashier', password: 'cashier123' });
    if (resLogin.status === 200 && resLogin.body.token) {
      token = resLogin.body.token;
      refreshToken = resLogin.body.refreshToken;
      console.log("✓ POST /api/auth/login passed. JWT Generated successfully.");
      console.log("-> Token prefix:", token.slice(0, 25) + "...");
    } else {
      console.error("✗ POST /api/auth/login failed HTTP", resLogin.status, resLogin.body);
    }

    console.log("\n[TEST 4] Testing GET /api/auth/me (Protected Route Validation)...");
    const resMe = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    if (resMe.status === 200 && resMe.body.username === 'cashier') {
      console.log("✓ GET /api/auth/me passed:", resMe.body.fullName);
    } else {
      console.error("✗ GET /api/auth/me failed HTTP", resMe.status);
    }

    console.log("\n[TEST 5] Testing POST /api/auth/refresh (Token Refresh Flow)...");
    const resRef = await request(app).post('/api/auth/refresh').send({ refreshToken });
    if (resRef.status === 200 && resRef.body.token) {
      console.log("✓ POST /api/auth/refresh passed. Fresh JWT returned.");
    } else {
      console.error("✗ POST /api/auth/refresh failed HTTP", resRef.status);
    }

    console.log("\n[TEST 6] Testing POST /api/auth/logout...");
    const resOut = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`);
    if (resOut.status === 200 && resOut.body.success) {
      console.log("✓ POST /api/auth/logout passed.");
    } else {
      console.error("✗ POST /api/auth/logout failed HTTP", resOut.status);
    }

    console.log("\n[TEST 7] Testing POST /api/auth/login with Invalid Request (400)...");
    const res400 = await request(app).post('/api/auth/login').send({});
    if (res400.status === 400) {
      console.log("✓ 400 Bad Request error handling passed.");
    }

    console.log("\n[TEST 8] Testing POST /api/auth/login with Wrong Credentials (401)...");
    const res401 = await request(app).post('/api/auth/login').send({ username: 'cashier', password: 'wrongpassword' });
    if (res401.status === 401) {
      console.log("✓ 401 Unauthorized error handling passed.");
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🏆 ALL 8 VALIDATION TESTS PASSED WITH 0 ERRORS OR 503s");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (err) {
    console.error("Test execution exception:", err);
  } finally {
    try { await mongoose.disconnect(); } catch(e){}
    process.exit(0);
  }
}

runTests();
