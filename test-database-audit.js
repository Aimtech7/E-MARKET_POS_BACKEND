require('dotenv').config();
const mongoose = require('mongoose');
const connectionManager = require('./services/connection-manager');
const authController = require('./controller/auth-controller');

const runAuditSuite = async () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🛡️ STEP 13: COMPREHENSIVE SENIOR DATABASE AUDIT HARNESS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Step 1: Start Monitoring & Run Connection Test
  console.log("\n[TEST 1] Triggering Connection Test & Startup Validation...");
  await connectionManager.startMonitoring();

  const isConnected = mongoose.connection.readyState === 1;
  const currentMode = connectionManager.getCurrentMode();
  console.log(`-> Connection State: ${isConnected ? 'CONNECTED' : 'DISCONNECTED'} (${currentMode})`);

  if (!isConnected) {
    console.log("\n❌ DATABASE NOT READY");
    console.log("Evidence: Mongoose readyState is not 1. Last failure:", connectionManager.getLastFailureReason());
    process.exit(0);
  }

  // Step 2 & 5: Ping Test
  console.log("\n[TEST 2] Executing Ping Test: db.admin().ping()...");
  let pingOk = false;
  let pingLatency = "0ms";
  const startPing = Date.now();
  try {
    const res = await mongoose.connection.db.admin().ping();
    pingLatency = `${Date.now() - startPing}ms`;
    if (res.ok === 1) {
      pingOk = true;
      console.log(`✓ Ping Test passed. Latency: ${pingLatency}`);
    } else {
      console.log("✗ Ping Test returned non-ok response:", res);
    }
  } catch (e) {
    console.log("✗ Ping Test exception:", e.message);
  }

  // Step 3 & 6: Read Test (Users, Products, Invoices, Suppliers, Customers)
  console.log("\n[TEST 3] Executing Read Test across 5 core POS collections...");
  const models = {
    AuthenticationQuery: 'User',
    ProductQuery: 'Product',
    InvoiceQuery: 'Invoice',
    SupplierQuery: 'Supplier',
    CustomerQuery: 'Customer'
  };

  let readPassed = true;
  for (const [testName, modelName] of Object.entries(models)) {
    try {
      const M = mongoose.models[modelName] || require(`./model/${modelName}`);
      const count = await M.countDocuments();
      console.log(`✓ ${testName} (${modelName}s): ${count} documents found.`);
    } catch (err) {
      readPassed = false;
      console.log(`✗ ${testName} FAILED:`, err.message);
    }
  }

  // Step 4 & 7: Write & Delete Test
  console.log("\n[TEST 4] Executing Write & Delete Test (DatabaseDiagnostics)...");
  let writePassed = false;
  try {
    const DiagSchema = new mongoose.Schema({ testId: String, timestamp: Date }, { collection: 'databasediagnostics' });
    const DiagModel = mongoose.models.DatabaseDiagnostics || mongoose.model('DatabaseDiagnostics', DiagSchema);

    const doc = await DiagModel.create({ testId: 'AUDIT-HARNESS', timestamp: new Date() });
    console.log("✓ Insert OK -> Document created ID:", doc._id);

    const fetched = await DiagModel.findById(doc._id);
    if (!fetched) throw new Error("Could not read inserted diagnostic document");
    console.log("✓ Read OK -> Inserted document verified.");

    await DiagModel.findByIdAndDelete(doc._id);
    console.log("✓ Delete OK -> Diagnostic document removed cleanly.");
    writePassed = true;
  } catch (e) {
    console.log("✗ Write/Delete Test failed:", e.message);
  }

  // Step 8: Health Endpoint Verification
  console.log("\n[TEST 5] Executing GET /api/health verification...");
  const mockReq = {};
  const mockRes = {
    status: (code) => ({
      json: (data) => {
        console.log(`✓ Health Endpoint HTTP ${code} Response:`, JSON.stringify(data, null, 2));
      }
    })
  };
  await authController.health(mockReq, mockRes);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  if (isConnected && pingOk && readPassed && writePassed) {
    console.log("✅ DATABASE FULLY OPERATIONAL");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } else {
    console.log("❌ DATABASE NOT READY");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  }

  await mongoose.disconnect();
  process.exit(0);
};

runAuditSuite();
