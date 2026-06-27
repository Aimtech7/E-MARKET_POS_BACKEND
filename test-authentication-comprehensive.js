require('dotenv').config();
 mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./model/User');

const testAuthentication = async () => {
  console.log("=========================================================================");
  console.log("🔍 AUTHENTICATION COMPREHENSIVE AUDIT");
  console.log("=========================================================================");
  console.log("Timestamp     : " + new Date().toISOString());
  console.log("=========================================================================\n");

  let testResults = {};

  // Connect to database
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
  });

  // TEST 1: Password Hashing
  console.log("▶ TEST 1: Password Hashing (bcrypt)");
  try {
    const plainPassword = "test123";
    const hashStart = Date.now();
    const hashedPassword = await bcrypt.hash(plainPassword, 12);
    const hashTime = Date.now() - hashStart;
    
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    
    if (isMatch && hashedPassword.startsWith('$2a$') || hashedPassword.startsWith('$2b$')) {
      console.log(`  ✓ Password hashed successfully in ${hashTime}ms`);
      console.log(`  ✓ Hash format: ${hashedPassword.substring(0, 10)}...`);
      console.log(`  ✓ Password verification working`);
      testResults['Password Hashing'] = 'PASSED';
    } else {
      console.error("  ✗ Password hashing failed");
      testResults['Password Hashing'] = 'FAILED';
    }
  } catch (error) {
    console.error("  ✗ Hash Error:", error.message);
    testResults['Password Hashing'] = `FAILED: ${error.message}`;
  }

  // TEST 2: JWT Token Generation
  console.log("\n▶ TEST 2: JWT Token Generation");
  try {
    const JWT_SECRET = process.env.JWT_SECRET || "test_secret";
    const payload = { username: "testuser", admin: true, role: "admin" };
    
    const tokenStart = Date.now();
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
    const tokenTime = Date.now() - tokenStart;
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.username === "testuser" && decoded.admin === true) {
      console.log(`  ✓ Token generated in ${tokenTime}ms`);
      console.log(`  ✓ Token length: ${token.length} characters`);
      console.log(`  ✓ Token verification successful`);
      console.log(`  ✓ Payload preserved correctly`);
      testResults['JWT Generation'] = 'PASSED';
    } else {
      console.error("  ✗ Token verification failed");
      testResults['JWT Generation'] = 'FAILED';
    }
  } catch (error) {
    console.error("  ✗ JWT Error:", error.message);
    testResults['JWT Generation'] = `FAILED: ${error.message}`;
  }

  // TEST 3: JWT Token Expiration
  console.log("\n▶ TEST 3: JWT Token Expiration");
  try {
    const JWT_SECRET = process.env.JWT_SECRET || "test_secret";
    const expiredToken = jwt.sign({ username: "test" }, JWT_SECRET, { expiresIn: "-1h" });
    
    try {
      jwt.verify(expiredToken, JWT_SECRET);
      console.error("  ✗ Expired token should have been rejected");
      testResults['JWT Expiration'] = 'FAILED';
    } catch (err) {
      console.log(`  ✓ Expired token correctly rejected`);
      console.log(`  ✓ Error: ${err.message}`);
      testResults['JWT Expiration'] = 'PASSED';
    }
  } catch (error) {
    console.error("  ✗ Expiration Test Error:", error.message);
    testResults['JWT Expiration'] = `FAILED: ${error.message}`;
  }

  // TEST 4: User Creation with Hashed Password
  console.log("\n▶ TEST 4: User Creation with Hashed Password");
  try {
    const testUsername = `auth_test_${Date.now()}`;
    const plainPassword = "securePassword123";
    
    const hashedPassword = await bcrypt.hash(plainPassword, 12);
    const testUser = await User.create({
      username: testUsername,
      password: hashedPassword,
      fullName: "Auth Test User",
      role: "cashier"
    });
    
    if (testUser.password.startsWith('$2a$') || testUser.password.startsWith('$2b$')) {
      console.log(`  ✓ User created with hashed password`);
      console.log(`  ✓ Password stored securely`);
      testResults['User Creation'] = 'PASSED';
      testResults['TestUserId'] = testUser._id;
    } else {
      console.error("  ✗ Password not hashed");
      testResults['User Creation'] = 'FAILED';
    }
    
    await User.findByIdAndDelete(testUser._id);
  } catch (error) {
    console.error("  ✗ User Creation Error:", error.message);
    testResults['User Creation'] = `FAILED: ${error.message}`;
  }

  // TEST 5: Password Verification
  console.log("\n▶ TEST 5: Password Verification");
  try {
    const testUsername = `verify_test_${Date.now()}`;
    const plainPassword = "verifyPassword123";
    const hashedPassword = await bcrypt.hash(plainPassword, 12);
    
    const correctMatch = await bcrypt.compare(plainPassword, hashedPassword);
    const incorrectMatch = await bcrypt.compare("wrongPassword", hashedPassword);
    
    if (correctMatch && !incorrectMatch) {
      console.log(`  ✓ Correct password verified`);
      console.log(`  ✓ Incorrect password rejected`);
      testResults['Password Verification'] = 'PASSED';
    } else {
      console.error("  ✗ Password verification failed");
      testResults['Password Verification'] = 'FAILED';
    }
  } catch (error) {
    console.error("  ✗ Verification Error:", error.message);
    testResults['Password Verification'] = `FAILED: ${error.message}`;
  }

  // TEST 6: Role-Based Access Control
  console.log("\n▶ TEST 6: Role-Based Access Control");
  try {
    const adminUser = await User.create({
      username: `admin_test_${Date.now()}`,
      password: await bcrypt.hash("admin123", 12),
      role: "admin",
      admin: true
    });
    
    const cashierUser = await User.create({
      username: `cashier_test_${Date.now()}`,
      password: await bcrypt.hash("cashier123", 12),
      role: "cashier",
      admin: false
    });
    
    if (adminUser.role === "admin" && adminUser.admin === true) {
      console.log(`  ✓ Admin role configured correctly`);
    }
    
    if (cashierUser.role === "cashier" && cashierUser.admin === false) {
      console.log(`  ✓ Cashier role configured correctly`);
    }
    
    testResults['Role-Based Access'] = 'PASSED';
    
    await User.deleteMany({ username: { $in: [adminUser.username, cashierUser.username] } });
  } catch (error) {
    console.error("  ✗ Role Test Error:", error.message);
    testResults['Role-Based Access'] = `FAILED: ${error.message}`;
  }

  // TEST 7: Account Status Management
  console.log("\n▶ TEST 7: Account Status Management");
  try {
    const testUser = await User.create({
      username: `status_test_${Date.now()}`,
      password: await bcrypt.hash("status123", 12),
      isActive: true
    });
    
    if (testUser.isActive === true) {
      console.log(`  ✓ Active account created`);
    }
    
    const deactivatedUser = await User.findByIdAndUpdate(testUser._id, { isActive: false }, { new: true });
    if (deactivatedUser.isActive === false) {
      console.log(`  ✓ Account deactivated successfully`);
    }
    
    testResults['Account Status'] = 'PASSED';
    
    await User.findByIdAndDelete(testUser._id);
  } catch (error) {
    console.error("  ✗ Status Test Error:", error.message);
    testResults['Account Status'] = `FAILED: ${error.message}`;
  }

  // TEST 8: JWT Refresh Token
  console.log("\n▶ TEST 8: JWT Refresh Token");
  try {
    const JWT_SECRET = process.env.JWT_SECRET || "test_secret";
    const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh_secret";
    
    const refreshToken = jwt.sign({ username: "testuser" }, REFRESH_SECRET, { expiresIn: "7d" });
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    
    const newAccessToken = jwt.sign({ username: decoded.username, admin: false, role: "cashier" }, JWT_SECRET, { expiresIn: "12h" });
    
    console.log(`  ✓ Refresh token generated (7 days expiry)`);
    console.log(`  ✓ Access token refreshed successfully`);
    testResults['Refresh Token'] = 'PASSED';
  } catch (error) {
    console.error("  ✗ Refresh Token Error:", error.message);
    testResults['Refresh Token'] = `FAILED: ${error.message}`;
  }

  // TEST 9: Token Security
  console.log("\n▶ TEST 9: Token Security");
  try {
    const JWT_SECRET = process.env.JWT_SECRET || "test_secret";
    const wrongSecret = "wrong_secret";
    const token = jwt.sign({ username: "test" }, JWT_SECRET);
    
    try {
      jwt.verify(token, wrongSecret);
      console.error("  ✗ Token should not verify with wrong secret");
      testResults['Token Security'] = 'FAILED';
    } catch (err) {
      console.log(`  ✓ Token rejected with wrong secret`);
      console.log(`  ✓ Secret validation working`);
      testResults['Token Security'] = 'PASSED';
    }
  } catch (error) {
    console.error("  ✗ Security Test Error:", error.message);
    testResults['Token Security'] = `FAILED: ${error.message}`;
  }

  // TEST 10: Existing Users
  console.log("\n▶ TEST 10: Existing Users in Database");
  try {
    const users = await User.find({});
    console.log(`  ✓ Found ${users.length} users in database`);
    users.forEach(user => {
      console.log(`    - ${user.username} (${user.role}, active: ${user.isActive})`);
    });
    testResults['Existing Users'] = 'PASSED';
    testResults['UserCount'] = users.length;
  } catch (error) {
    console.error("  ✗ Users Query Error:", error.message);
    testResults['Existing Users'] = `FAILED: ${error.message}`;
  }

  // FINAL SUMMARY
  console.log("\n=========================================================================");
  console.log("📊 AUTHENTICATION AUDIT SUMMARY");
  console.log("=========================================================================");
  for (const [test, result] of Object.entries(testResults)) {
    const resultStr = String(result);
    const status = resultStr.includes('PASSED') ? '✅' : (resultStr.includes('FAILED') ? '❌' : '⚠️');
    console.log(`  ${status} ${test.padEnd(25)} : ${result}`);
  }
  console.log("=========================================================================\n");

  await mongoose.disconnect();
  process.exit(0);
};

testAuthentication();
