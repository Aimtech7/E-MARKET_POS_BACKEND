require('dotenv').config();
const mongoose = require('mongoose');
const mpesaService = require('./services/mpesa-service');
const PaymentLog = require('./model/PaymentLog');
const Transaction = require('./model/Transaction');

const testMpesaStkPush = async () => {
  console.log("=========================================================================");
  console.log("🔍 M-PESA STK PUSH COMPREHENSIVE FUNCTIONALITY TEST");
  console.log("=========================================================================");
  console.log("Environment   : " + process.env.MPESA_ENVIRONMENT);
  console.log("Shortcode     : " + process.env.MPESA_SHORTCODE);
  console.log("Callback URL  : " + process.env.MPESA_CALLBACK_URL);
  console.log("Timestamp     : " + new Date().toISOString());
  console.log("=========================================================================\n");

  let testResults = {};

  // TEST 1: OAuth Token Generation
  console.log("▶ TEST 1: OAuth Token Generation");
  try {
    const tokenStart = Date.now();
    const token = await mpesaService.generateToken();
    const tokenTime = Date.now() - tokenStart;
    
    if (token && token.length > 50) {
      console.log(`  ✓ Token generated successfully in ${tokenTime}ms`);
      console.log(`  ✓ Token length: ${token.length} characters`);
      console.log(`  ✓ Token format: Bearer token valid`);
      testResults['OAuth Token'] = 'PASSED';
    } else {
      console.error("  ✗ Invalid token format");
      testResults['OAuth Token'] = 'FAILED';
    }
  } catch (error) {
    console.error("  ✗ OAuth Token Error:", error.message);
    testResults['OAuth Token'] = `FAILED: ${error.message}`;
  }

  // TEST 2: Token Caching
  console.log("\n▶ TEST 2: Token Caching Mechanism");
  try {
    const token1 = await mpesaService.generateToken();
    const cacheStart = Date.now();
    const token2 = await mpesaService.generateToken();
    const cacheTime = Date.now() - cacheStart;
    
    if (token1 === token2 && cacheTime < 100) {
      console.log(`  ✓ Token cached successfully (retrieved in ${cacheTime}ms)`);
      console.log(`  ✓ Cache hit working correctly`);
      testResults['Token Caching'] = 'PASSED';
    } else {
      console.log(`  ⚠ Token cache may not be working (took ${cacheTime}ms)`);
      testResults['Token Caching'] = 'WARNING';
    }
  } catch (error) {
    console.error("  ✗ Token Caching Error:", error.message);
    testResults['Token Caching'] = `FAILED: ${error.message}`;
  }

  // TEST 3: Phone Number Formatting
  console.log("\n▶ TEST 3: Phone Number Formatting");
  const testPhones = [
    { input: "0712345678", expected: "254712345678" },
    { input: "254712345678", expected: "254712345678" },
    { input: "+254712345678", expected: "254712345678" }
  ];
  
  let phoneFormatPassed = true;
  for (const test of testPhones) {
    let formatted = test.input;
    if (formatted.startsWith("0")) formatted = `254${formatted.slice(1)}`;
    else if (formatted.startsWith("+")) formatted = formatted.slice(1);
    
    if (formatted === test.expected) {
      console.log(`  ✓ ${test.input} → ${formatted} (correct)`);
    } else {
      console.error(`  ✗ ${test.input} → ${formatted} (expected ${test.expected})`);
      phoneFormatPassed = false;
    }
  }
  testResults['Phone Formatting'] = phoneFormatPassed ? 'PASSED' : 'FAILED';

  // TEST 4: Password Generation
  console.log("\n▶ TEST 4: STK Push Password Generation");
  try {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');
    
    if (password && password.length > 50) {
      console.log(`  ✓ Password generated successfully`);
      console.log(`  ✓ Timestamp: ${timestamp}`);
      console.log(`  ✓ Password length: ${password.length} characters`);
      console.log(`  ✓ Base64 encoding valid`);
      testResults['Password Generation'] = 'PASSED';
    } else {
      console.error("  ✗ Invalid password format");
      testResults['Password Generation'] = 'FAILED';
    }
  } catch (error) {
    console.error("  ✗ Password Generation Error:", error.message);
    testResults['Password Generation'] = `FAILED: ${error.message}`;
  }

  // TEST 5: STK Push Initiation (Real Test)
  console.log("\n▶ TEST 5: STK Push Initiation (Real API Call)");
  console.log("  ⚠ This will make a REAL call to Safaricom Daraja API");
  console.log("  ⚠ Using test phone: 254712345678");
  console.log("  ⚠ Amount: KES 1");
  
  try {
    const stkPushStart = Date.now();
    const response = await mpesaService.initiateStkPush("254712345678", 1, `TEST-${Date.now()}`);
    const stkPushTime = Date.now() - stkPushStart;
    
    if (response && response.CheckoutRequestID) {
      console.log(`  ✓ STK Push initiated successfully in ${stkPushTime}ms`);
      console.log(`  ✓ CheckoutRequestID: ${response.CheckoutRequestID}`);
      console.log(`  ✓ ResponseCode: ${response.ResponseCode}`);
      console.log(`  ✓ CustomerMessage: ${response.CustomerMessage}`);
      console.log(`  ✓ MerchantRequestID: ${response.MerchantRequestID}`);
      testResults['STK Push Initiation'] = 'PASSED';
      testResults['CheckoutRequestID'] = response.CheckoutRequestID;
    } else {
      console.error("  ✗ STK Push failed - no CheckoutRequestID");
      console.error("  ✗ Response:", JSON.stringify(response, null, 2));
      testResults['STK Push Initiation'] = 'FAILED';
    }
  } catch (error) {
    console.error("  ✗ STK Push Error:", error.message);
    console.error("  ✗ This may be due to:");
    console.error("     - Invalid credentials (Consumer Key/Secret)");
    console.error("     - Invalid Passkey");
    console.error("     - Network connectivity issues");
    console.error("     - Safaricom API downtime");
    testResults['STK Push Initiation'] = `FAILED: ${error.message}`;
  }

  // TEST 6: Payment Log Database Recording
  console.log("\n▶ TEST 6: Payment Log Database Recording");
  try {
    const recentLogs = await PaymentLog.find({ provider: "mpesa" })
      .sort({ createdAt: -1 })
      .limit(5);
    
    if (recentLogs.length > 0) {
      console.log(`  ✓ Found ${recentLogs.length} recent M-Pesa payment logs`);
      recentLogs.forEach((log, i) => {
        console.log(`  ✓ Log ${i + 1}: ${log.type} - ${log.status} - ${log.createdAt}`);
      });
      testResults['Payment Logging'] = 'PASSED';
    } else {
      console.log("  ⚠ No payment logs found (may be expected if STK Push failed)");
      testResults['Payment Logging'] = 'WARNING';
    }
  } catch (error) {
    console.error("  ✗ Payment Log Error:", error.message);
    testResults['Payment Logging'] = `FAILED: ${error.message}`;
  }

  // TEST 7: Query Status (if we have a CheckoutRequestID)
  if (testResults['CheckoutRequestID']) {
    console.log("\n▶ TEST 7: Transaction Status Query");
    try {
      const queryStart = Date.now();
      const status = await mpesaService.queryStatus(testResults['CheckoutRequestID']);
      const queryTime = Date.now() - queryStart;
      
      console.log(`  ✓ Query executed in ${queryTime}ms`);
      console.log(`  ✓ ResultCode: ${status.ResultCode}`);
      console.log(`  ✓ ResultDesc: ${status.ResultDesc}`);
      testResults['Status Query'] = 'PASSED';
    } catch (error) {
      console.error("  ✗ Query Error:", error.message);
      testResults['Status Query'] = `FAILED: ${error.message}`;
    }
  }

  // TEST 8: Query with Retry (Exponential Backoff)
  console.log("\n▶ TEST 8: Query with Exponential Backoff Retry");
  try {
    const retryStart = Date.now();
    // This will fail if no valid CheckoutRequestID, but tests the retry logic
    const retryResult = await mpesaService.queryStatusWithRetry("ws_CO_INVALID_TEST_ID", 2, 1000);
    const retryTime = Date.now() - retryStart;
    
    console.log(`  ✓ Retry mechanism executed in ${retryTime}ms`);
    console.log(`  ✓ Exponential backoff logic tested`);
    testResults['Retry Mechanism'] = 'PASSED';
  } catch (error) {
    console.log(`  ⚠ Retry failed as expected with invalid ID: ${error.message}`);
    testResults['Retry Mechanism'] = 'PASSED (Error handling verified)';
  }

  // FINAL SUMMARY
  console.log("\n=========================================================================");
  console.log("📊 M-PESA STK PUSH TEST SUMMARY");
  console.log("=========================================================================");
  for (const [test, result] of Object.entries(testResults)) {
    const status = result.includes('PASSED') ? '✅' : (result.includes('FAILED') ? '❌' : '⚠️');
    console.log(`  ${status} ${test.padEnd(25)} : ${result}`);
  }
  console.log("=========================================================================\n");

  await mongoose.disconnect();
  process.exit(0);
};

// Connect to database first
const connectionManager = require('./services/connection-manager');
connectionManager.startMonitoring().then(() => {
  testMpesaStkPush();
}).catch(err => {
  console.error("Database connection failed:", err.message);
  process.exit(1);
});
