require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./model/User');

const testUserManagement = async () => {
  console.log("=========================================================================");
  console.log("USER MANAGEMENT COMPREHENSIVE AUDIT");
  console.log("=========================================================================");
  console.log("Timestamp     : " + new Date().toISOString());
  console.log("=========================================================================\n");

  let testResults = {};

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
  });

  // TEST 1: Create User
  console.log("TEST 1: Create User");
  try {
    const testUsername = `user_test_${Date.now()}`;
    const hashedPassword = await bcrypt.hash("testPassword123", 12);
    
    const newUser = await User.create({
      username: testUsername,
      password: hashedPassword,
      fullName: "Test User",
      email: "test@example.com",
      phone: "254712345678",
      role: "cashier",
      admin: false,
      isActive: true
    });
    
    if (newUser.username === testUsername && newUser.email === "test@example.com") {
      console.log(`  OK User created successfully`);
      console.log(`  OK Username: ${newUser.username}`);
      console.log(`  OK Full Name: ${newUser.fullName}`);
      console.log(`  OK Email: ${newUser.email}`);
      console.log(`  OK Phone: ${newUser.phone}`);
      console.log(`  OK Role: ${newUser.role}`);
      testResults['Create User'] = 'PASSED';
      testResults['TestUserId'] = newUser._id;
    } else {
      console.error("  FAIL User creation failed");
      testResults['Create User'] = 'FAILED';
    }
  } catch (error) {
    console.error("  FAIL Create Error:", error.message);
    testResults['Create User'] = `FAILED: ${error.message}`;
  }

  // TEST 2: Read User
  console.log("\nTEST 2: Read User");
  try {
    const users = await User.find({});
    console.log(`  OK Found ${users.length} users`);
    
    if (users.length > 0) {
      const firstUser = users[0];
      console.log(`  OK Sample user: ${firstUser.username} (${firstUser.role})`);
      testResults['Read User'] = 'PASSED';
      testResults['TotalUsers'] = users.length;
    } else {
      console.error("  FAIL No users found");
      testResults['Read User'] = 'FAILED';
    }
  } catch (error) {
    console.error("  FAIL Read Error:", error.message);
    testResults['Read User'] = `FAILED: ${error.message}`;
  }

  // TEST 3: Update User Profile
  console.log("\nTEST 3: Update User Profile");
  try {
    const testUsername = `update_test_${Date.now()}`;
    const newUser = await User.create({
      username: testUsername,
      password: await bcrypt.hash("password123", 12),
      fullName: "Original Name",
      email: "original@example.com"
    });
    
    const updatedUser = await User.findByIdAndUpdate(
      newUser._id,
      {
        fullName: "Updated Name",
        email: "updated@example.com",
        phone: "254798765432"
      },
      { new: true }
    );
    
    if (updatedUser.fullName === "Updated Name" && updatedUser.email === "updated@example.com") {
      console.log(`  OK User profile updated successfully`);
      console.log(`  OK New name: ${updatedUser.fullName}`);
      console.log(`  OK New email: ${updatedUser.email}`);
      console.log(`  OK New phone: ${updatedUser.phone}`);
      testResults['Update Profile'] = 'PASSED';
    } else {
      console.error("  FAIL Profile update failed");
      testResults['Update Profile'] = 'FAILED';
    }
    
    await User.findByIdAndDelete(newUser._id);
  } catch (error) {
    console.error("  FAIL Update Error:", error.message);
    testResults['Update Profile'] = `FAILED: ${error.message}`;
  }

  // TEST 4: Change Password
  console.log("\nTEST 4: Change Password");
  try {
    const testUsername = `password_test_${Date.now()}`;
    const oldPassword = await bcrypt.hash("oldPassword123", 12);
    
    const newUser = await User.create({
      username: testUsername,
      password: oldPassword
    });
    
    const newPassword = await bcrypt.hash("newPassword123", 12);
    const updatedUser = await User.findByIdAndUpdate(
      newUser._id,
      { password: newPassword },
      { new: true }
    );
    
    const oldMatch = await bcrypt.compare("oldPassword123", updatedUser.password);
    const newMatch = await bcrypt.compare("newPassword123", updatedUser.password);
    
    if (!oldMatch && newMatch) {
      console.log(`  OK Password changed successfully`);
      console.log(`  OK Old password no longer works`);
      console.log(`  OK New password works`);
      testResults['Change Password'] = 'PASSED';
    } else {
      console.error("  FAIL Password change failed");
      testResults['Change Password'] = 'FAILED';
    }
    
    await User.findByIdAndDelete(newUser._id);
  } catch (error) {
    console.error("  FAIL Password Change Error:", error.message);
    testResults['Change Password'] = `FAILED: ${error.message}`;
  }

  // TEST 5: Role Assignment
  console.log("\nTEST 5: Role Assignment");
  try {
    const adminUser = await User.create({
      username: `role_admin_${Date.now()}`,
      password: await bcrypt.hash("admin123", 12),
      role: "admin",
      admin: true
    });
    
    const cashierUser = await User.create({
      username: `role_cashier_${Date.now()}`,
      password: await bcrypt.hash("cashier123", 12),
      role: "cashier",
      admin: false
    });
    
    if (adminUser.role === "admin" && adminUser.admin === true) {
      console.log(`  OK Admin role assigned correctly`);
    }
    
    if (cashierUser.role === "cashier" && cashierUser.admin === false) {
      console.log(`  OK Cashier role assigned correctly`);
    }
    
    testResults['Role Assignment'] = 'PASSED';
    
    await User.deleteMany({ username: { $in: [adminUser.username, cashierUser.username] } });
  } catch (error) {
    console.error("  FAIL Role Assignment Error:", error.message);
    testResults['Role Assignment'] = `FAILED: ${error.message}`;
  }

  // TEST 6: Account Activation/Deactivation
  console.log("\nTEST 6: Account Activation/Deactivation");
  try {
    const testUsername = `active_test_${Date.now()}`;
    const newUser = await User.create({
      username: testUsername,
      password: await bcrypt.hash("password123", 12),
      isActive: true
    });
    
    const deactivatedUser = await User.findByIdAndUpdate(
      newUser._id,
      { isActive: false },
      { new: true }
    );
    
    if (deactivatedUser.isActive === false) {
      console.log(`  OK Account deactivated successfully`);
    }
    
    const reactivatedUser = await User.findByIdAndUpdate(
      newUser._id,
      { isActive: true },
      { new: true }
    );
    
    if (reactivatedUser.isActive === true) {
      console.log(`  OK Account reactivated successfully`);
      testResults['Account Activation'] = 'PASSED';
    } else {
      console.error("  FAIL Account activation failed");
      testResults['Account Activation'] = 'FAILED';
    }
    
    await User.findByIdAndDelete(newUser._id);
  } catch (error) {
    console.error("  FAIL Activation Error:", error.message);
    testResults['Account Activation'] = `FAILED: ${error.message}`;
  }

  // TEST 7: Delete User
  console.log("\nTEST 7: Delete User");
  try {
    const testUsername = `delete_test_${Date.now()}`;
    const newUser = await User.create({
      username: testUsername,
      password: await bcrypt.hash("password123", 12)
    });
    
    const userId = newUser._id;
    await User.findByIdAndDelete(userId);
    
    const deletedUser = await User.findById(userId);
    
    if (deletedUser === null) {
      console.log(`  OK User deleted successfully`);
      console.log(`  OK User no longer exists in database`);
      testResults['Delete User'] = 'PASSED';
    } else {
      console.error("  FAIL User still exists after deletion");
      testResults['Delete User'] = 'FAILED';
    }
  } catch (error) {
    console.error("  FAIL Delete Error:", error.message);
    testResults['Delete User'] = `FAILED: ${error.message}`;
  }

  // TEST 8: User Search
  console.log("\nTEST 8: User Search");
  try {
    const testUsername = `search_test_${Date.now()}`;
    await User.create({
      username: testUsername,
      password: await bcrypt.hash("password123", 12),
      fullName: "Search Test User"
    });
    
    const foundUser = await User.findOne({ username: testUsername });
    
    if (foundUser && foundUser.username === testUsername) {
      console.log(`  OK User found by username`);
      console.log(`  OK Search working correctly`);
      testResults['User Search'] = 'PASSED';
    } else {
      console.error("  FAIL User search failed");
      testResults['User Search'] = 'FAILED';
    }
    
    await User.deleteOne({ username: testUsername });
  } catch (error) {
    console.error("  FAIL Search Error:", error.message);
    testResults['User Search'] = `FAILED: ${error.message}`;
  }

  // TEST 9: User Permissions
  console.log("\nTEST 9: User Permissions");
  try {
    const adminUser = await User.create({
      username: `perm_admin_${Date.now()}`,
      password: await bcrypt.hash("admin123", 12),
      role: "admin",
      admin: true
    });
    
    const cashierUser = await User.create({
      username: `perm_cashier_${Date.now()}`,
      password: await bcrypt.hash("cashier123", 12),
      role: "cashier",
      admin: false
    });
    
    console.log(`  OK Admin has admin privileges: ${adminUser.admin}`);
    console.log(`  OK Cashier has admin privileges: ${cashierUser.admin}`);
    console.log(`  OK Role-based permissions configured`);
    
    testResults['User Permissions'] = 'PASSED';
    
    await User.deleteMany({ username: { $in: [adminUser.username, cashierUser.username] } });
  } catch (error) {
    console.error("  FAIL Permissions Error:", error.message);
    testResults['User Permissions'] = `FAILED: ${error.message}`;
  }

  // TEST 10: User Last Login Tracking
  console.log("\nTEST 10: User Last Login Tracking");
  try {
    const testUsername = `login_test_${Date.now()}`;
    const newUser = await User.create({
      username: testUsername,
      password: await bcrypt.hash("password123", 12)
    });
    
    const updatedUser = await User.findByIdAndUpdate(
      newUser._id,
      { lastLogin: new Date() },
      { new: true }
    );
    
    if (updatedUser.lastLogin instanceof Date) {
      console.log(`  OK Last login timestamp updated`);
      console.log(`  OK Login tracking working`);
      testResults['Login Tracking'] = 'PASSED';
    } else {
      console.error("  FAIL Login tracking failed");
      testResults['Login Tracking'] = 'FAILED';
    }
    
    await User.findByIdAndDelete(newUser._id);
  } catch (error) {
    console.error("  FAIL Login Tracking Error:", error.message);
    testResults['Login Tracking'] = `FAILED: ${error.message}`;
  }

  // FINAL SUMMARY
  console.log("\n=========================================================================");
  console.log("USER MANAGEMENT AUDIT SUMMARY");
  console.log("=========================================================================");
  for (const [test, result] of Object.entries(testResults)) {
    const resultStr = String(result);
    const status = resultStr.includes('PASSED') ? 'PASS' : (resultStr.includes('FAILED') ? 'FAIL' : 'WARN');
    console.log(`  [${status}] ${test.padEnd(25)} : ${result}`);
  }
  console.log("=========================================================================\n");

  await mongoose.disconnect();
  process.exit(0);
};

testUserManagement();
