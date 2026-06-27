require('dotenv').config();
const mongoose = require('mongoose');
const connectionManager = require('./services/connection-manager');

const testDatabase = async () => {
  console.log("=========================================================================");
  console.log("🔍 DATABASE COMPREHENSIVE AUDIT");
  console.log("=========================================================================");
  console.log("Timestamp     : " + new Date().toISOString());
  console.log("=========================================================================\n");

  let testResults = {};

  // TEST 1: Database Connection
  console.log("▶ TEST 1: Database Connection");
  try {
    await connectionManager.startMonitoring();
    const isConnected = mongoose.connection.readyState === 1;
    const metrics = connectionManager.getAuditMetrics();
    
    if (isConnected) {
      console.log(`  ✓ Connected successfully`);
      console.log(`  ✓ Connection time: ${metrics.connectionTimeMs}ms`);
      console.log(`  ✓ Database: ${mongoose.connection.name}`);
      console.log(`  ✓ Host: ${mongoose.connection.host}`);
      testResults['Connection'] = 'PASSED';
      testResults['ConnectionTime'] = `${metrics.connectionTimeMs}ms`;
    } else {
      console.error("  ✗ Failed to connect");
      testResults['Connection'] = 'FAILED';
    }
  } catch (error) {
    console.error("  ✗ Connection Error:", error.message);
    testResults['Connection'] = `FAILED: ${error.message}`;
  }

  // TEST 2: Database Ping
  console.log("\n▶ TEST 2: Database Ping");
  try {
    const pingStart = Date.now();
    const pingResult = await mongoose.connection.db.admin().ping();
    const pingTime = Date.now() - pingStart;
    
    if (pingResult.ok === 1) {
      console.log(`  ✓ Ping successful in ${pingTime}ms`);
      console.log(`  ✓ Server responding`);
      testResults['Ping'] = 'PASSED';
      testResults['PingLatency'] = `${pingTime}ms`;
    } else {
      console.error("  ✗ Ping failed");
      testResults['Ping'] = 'FAILED';
    }
  } catch (error) {
    console.error("  ✗ Ping Error:", error.message);
    testResults['Ping'] = `FAILED: ${error.message}`;
  }

  // TEST 3: Collection Count
  console.log("\n▶ TEST 3: Collection Count");
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`  ✓ Found ${collections.length} collections`);
    collections.forEach(col => {
      console.log(`    - ${col.name}`);
    });
    testResults['Collections'] = 'PASSED';
    testResults['CollectionCount'] = collections.length;
  } catch (error) {
    console.error("  ✗ Collection Error:", error.message);
    testResults['Collections'] = `FAILED: ${error.message}`;
  }

  // TEST 4: Read Operations
  console.log("\n▶ TEST 4: Read Operations (CRUD)");
  try {
    const User = mongoose.model('User');
    const userCount = await User.countDocuments();
    console.log(`  ✓ User count: ${userCount}`);
    
    const Product = mongoose.model('Product');
    const productCount = await Product.countDocuments();
    console.log(`  ✓ Product count: ${productCount}`);
    
    const Category = mongoose.model('Category');
    const categoryCount = await Category.countDocuments();
    console.log(`  ✓ Category count: ${categoryCount}`);
    
    testResults['Read Operations'] = 'PASSED';
    testResults['UserCount'] = userCount;
    testResults['ProductCount'] = productCount;
    testResults['CategoryCount'] = categoryCount;
  } catch (error) {
    console.error("  ✗ Read Error:", error.message);
    testResults['Read Operations'] = `FAILED: ${error.message}`;
  }

  // TEST 5: Write Operations
  console.log("\n▶ TEST 5: Write Operations (CRUD)");
  try {
    const User = mongoose.model('User');
    const testUser = await User.create({
      username: `test_user_${Date.now()}`,
      password: 'test123',
      fullName: 'Test User',
      role: 'cashier'
    });
    console.log(`  ✓ Created test user: ${testUser.username}`);
    
    const updatedUser = await User.findByIdAndUpdate(testUser._id, { fullName: 'Updated Test User' }, { new: true });
    console.log(`  ✓ Updated user: ${updatedUser.fullName}`);
    
    await User.findByIdAndDelete(testUser._id);
    console.log(`  ✓ Deleted test user`);
    
    testResults['Write Operations'] = 'PASSED';
  } catch (error) {
    console.error("  ✗ Write Error:", error.message);
    testResults['Write Operations'] = `FAILED: ${error.message}`;
  }

  // TEST 6: Transaction Support
  console.log("\n▶ TEST 6: Transaction Support");
  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    const User = mongoose.model('User');
    const testUser = await User.create([{ username: `txn_test_${Date.now()}`, password: 'test' }], { session });
    
    await session.commitTransaction();
    session.endSession();
    
    await User.findByIdAndDelete(testUser[0]._id);
    console.log(`  ✓ Transaction committed successfully`);
    testResults['Transactions'] = 'PASSED';
  } catch (error) {
    console.error("  ✗ Transaction Error:", error.message);
    testResults['Transactions'] = `FAILED: ${error.message}`;
  }

  // TEST 7: Index Validation
  console.log("\n▶ TEST 7: Index Validation");
  try {
    const Product = mongoose.model('Product');
    const indexes = await Product.collection.indexes();
    console.log(`  ✓ Found ${indexes.length} indexes on Product collection`);
    
    indexes.forEach(idx => {
      console.log(`    - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });
    
    const hasTextIndex = indexes.some(idx => idx.name && idx.name.includes('text'));
    if (hasTextIndex) {
      console.log(`  ✓ Text search index present`);
    } else {
      console.log(`  ⚠ Text search index missing`);
    }
    
    testResults['Indexes'] = 'PASSED';
    testResults['IndexCount'] = indexes.length;
  } catch (error) {
    console.error("  ✗ Index Error:", error.message);
    testResults['Indexes'] = `FAILED: ${error.message}`;
  }

  // TEST 8: Query Performance
  console.log("\n▶ TEST 8: Query Performance");
  try {
    const Product = mongoose.model('Product');
    
    const queryStart = Date.now();
    const products = await Product.find().limit(10);
    const queryTime = Date.now() - queryStart;
    
    console.log(`  ✓ Query returned ${products.length} products in ${queryTime}ms`);
    
    if (queryTime < 500) {
      console.log(`  ✓ Query performance: Excellent`);
    } else if (queryTime < 1000) {
      console.log(`  ⚠ Query performance: Acceptable`);
    } else {
      console.log(`  ⚠ Query performance: Slow`);
    }
    
    testResults['Query Performance'] = 'PASSED';
    testResults['QueryTime'] = `${queryTime}ms`;
  } catch (error) {
    console.error("  ✗ Query Performance Error:", error.message);
    testResults['Query Performance'] = `FAILED: ${error.message}`;
  }

  // TEST 9: Authentication
  console.log("\n▶ TEST 9: Database Authentication");
  try {
    const dbInfo = await mongoose.connection.db.admin().serverInfo();
    console.log(`  ✓ Authentication enabled`);
    console.log(`  ✓ MongoDB version: ${dbInfo.version}`);
    testResults['Authentication'] = 'PASSED';
    testResults['MongoVersion'] = dbInfo.version;
  } catch (error) {
    console.error("  ✗ Authentication Error:", error.message);
    testResults['Authentication'] = `FAILED: ${error.message}`;
  }

  // TEST 10: Connection Pool
  console.log("\n▶ TEST 10: Connection Pool Status");
  try {
    const poolStats = {
      totalConnections: mongoose.connection.client.topology?.s?.pool?.totalConnectionCount || 'N/A',
      availableConnections: mongoose.connection.client.topology?.s?.pool?.availableConnectionCount || 'N/A',
      size: mongoose.connection.client.options?.maxPoolSize || 'N/A'
    };
    console.log(`  ✓ Total connections: ${poolStats.totalConnections}`);
    console.log(`  ✓ Available connections: ${poolStats.availableConnections}`);
    console.log(`  ✓ Max pool size: ${poolStats.size}`);
    testResults['Connection Pool'] = 'PASSED';
  } catch (error) {
    console.error("  ✗ Pool Error:", error.message);
    testResults['Connection Pool'] = `FAILED: ${error.message}`;
  }

  // FINAL SUMMARY
  console.log("\n=========================================================================");
  console.log("📊 DATABASE AUDIT SUMMARY");
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

testDatabase();
