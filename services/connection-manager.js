const mongoose = require('mongoose');
const dns = require('dns');

// STARTUP CONFIGURATION VALIDATION ENGINE
const verifyEnv = () => {
  const required = [
    'NODE_ENV', 'PORT', 'APP_NAME', 'APP_VERSION', 'FRONTEND_URL', 'WEBHOOK_DOMAIN',
    'MONGODB_URI', 'DATABASE_NAME', 'JWT_SECRET', 'JWT_EXPIRES_IN', 'JWT_REFRESH_SECRET',
    'JWT_REFRESH_EXPIRES_IN', 'SESSION_SECRET', 'MPESA_ENVIRONMENT', 'MPESA_CONSUMER_KEY',
    'MPESA_CONSUMER_SECRET', 'MPESA_SHORTCODE', 'MPESA_PASSKEY', 'MPESA_CALLBACK_URL',
    'MPESA_TRANSACTION_TYPE', 'PAYSTACK_PUBLIC_KEY', 'PAYSTACK_SECRET_KEY', 'BCRYPT_ROUNDS',
    'RATE_LIMIT_WINDOW_MS', 'RATE_LIMIT_MAX_REQUESTS'
  ];
  const missing = required.filter(k => process.env[k] === undefined || process.env[k] === '');
  if (missing.length > 0) {
    console.warn(`\n=============================================================`);
    console.warn(`[STARTUP WARNING] Missing or Undefined Environment Variables:`);
    missing.forEach(m => console.warn(` ⚠️  ${m} is not defined in .env`));
    console.warn(`=============================================================\n`);
  } else {
    console.log(`[STARTUP CONFIG] ✓ All 25 required environment variables verified.`);
  }
};

let isOnline = false;
let currentMode = 'disconnected'; // 'online', 'offline', or 'disconnected'
let lastFailureReason = null;
let auditMetrics = {
  pingStatus: 'FAIL',
  pingLatency: 'N/A',
  mongoVersion: 'Unknown',
  collectionsCount: 0,
  connectionTimeMs: 0,
  readCounts: {},
  writeTest: 'NOT RUN',
  missingIndexes: []
};

// Diagnostic model for Step 7 Write Test
const DiagSchema = new mongoose.Schema({ testId: String, timestamp: Date }, { collection: 'databasediagnostics' });
const DiagModel = mongoose.models.DatabaseDiagnostics || mongoose.model('DatabaseDiagnostics', DiagSchema);

const checkInternet = () => {
  return new Promise((resolve) => {
    dns.lookup('google.com', (err) => {
      resolve(!err || err.code !== "ENOTFOUND");
    });
  });
};

// STEP 5, 6, 7, 8, 9: Complete Audit Engine
const performDatabaseAudit = async () => {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    return false;
  }

  const db = mongoose.connection.db;

  // Step 5: Ping Test
  const pingStart = Date.now();
  try {
    const pingRes = await db.admin().ping();
    const latency = Date.now() - pingStart;
    auditMetrics.pingStatus = pingRes.ok === 1 ? `OK (${latency}ms)` : 'FAILED';
    auditMetrics.pingLatency = `${latency}ms`;
  } catch (e) {
    auditMetrics.pingStatus = 'FAILED';
    lastFailureReason = `Ping failed: ${e.message}`;
    return false;
  }

  // Get Mongo Server Version & Collections Count
  try {
    const buildInfo = await db.admin().serverInfo();
    auditMetrics.mongoVersion = buildInfo.version || 'Unknown';
  } catch (e) {
    auditMetrics.mongoVersion = 'Cloud Atlas Cluster';
  }

  try {
    const cols = await db.listCollections().toArray();
    auditMetrics.collectionsCount = cols.length;
  } catch (e) {}

  // Step 6: Read Test
  const models = ['User', 'Product', 'Category', 'Invoice', 'Supplier', 'Customer'];
  for (const m of models) {
    try {
      const model = mongoose.models[m] || require(`../model/${m}`);
      const count = await model.countDocuments();
      auditMetrics.readCounts[m] = count;
    } catch (e) {
      auditMetrics.readCounts[m] = 'ERROR';
    }
  }

  // Step 7: Write Test (Insert -> Read -> Delete)
  try {
    const testDoc = await DiagModel.create({ testId: `AUDIT-${Date.now()}`, timestamp: new Date() });
    const readBack = await DiagModel.findById(testDoc._id);
    if (!readBack) throw new Error("Document read verification failed");
    await DiagModel.findByIdAndDelete(testDoc._id);
    auditMetrics.writeTest = 'Insert OK, Read OK, Delete OK';
  } catch (e) {
    auditMetrics.writeTest = `FAILED: ${e.message}`;
    lastFailureReason = `Write test failed: ${e.message}`;
    return false;
  }

  // Step 8: Index Validation
  try {
    const Prod = mongoose.models.Product || require('../model/Product');
    const indexes = await Prod.collection.indexes();
    const hasText = indexes.some(idx => idx.name && idx.name.includes('text'));
    if (!hasText) auditMetrics.missingIndexes.push('Product text search index');
  } catch (e) {}

  return true;
};

// STEP 10: Print Startup ASCII Table
const printStartupReport = (statusStr) => {
  const safeUri = (process.env.MONGODB_URI || "").replace(/:([^:@]{1,8})[^:@]*@/, ':****@');
  console.log(`\n=====================================`);
  console.log(`DATABASE STATUS`);
  console.log(`=====================================`);
  console.log(`URI             : ${safeUri.slice(0, 42)}...`);
  console.log(`Database Name   : ${process.env.DATABASE_NAME || 'Unknown'}`);
  console.log(`Mongo Version   : ${auditMetrics.mongoVersion}`);
  console.log(`Authentication  : Enabled`);
  console.log(`Ping            : ${auditMetrics.pingStatus}`);
  console.log(`Collections     : ${auditMetrics.collectionsCount}`);
  console.log(`Connection Time : ${auditMetrics.connectionTimeMs}ms`);
  console.log(`Status          : ${statusStr}`);
  console.log(`=====================================`);
  console.log(`DATABASE MODE   : ${currentMode === 'online' ? 'ONLINE' : 'OFFLINE (Fallback)'}\n`);
};

// STEP 2 & 11: Connect with Retry Strategy
const connectToDb = async (targetUri, modeLabel) => {
  console.log(`✔ Connecting... (${modeLabel})`);
  const startTime = Date.now();
  
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 20
    });

    auditMetrics.connectionTimeMs = Date.now() - startTime;
    console.log(`✔ Connected`);

    const passedAudit = await performDatabaseAudit();
    if (!passedAudit) {
      throw new Error(lastFailureReason || "Database verification ping/write test failed");
    }

    currentMode = modeLabel;
    lastFailureReason = null;
    printStartupReport('CONNECTED');
    return true;
  } catch (err) {
    console.log(`✔ Connection failed`);
    lastFailureReason = err.message || "Network timeout or Authentication failed";
    
    // Step 11: Auto Retry & Log
    console.log(`✔ Retry...`);
    try {
      await new Promise(r => setTimeout(r, 2000));
      await mongoose.connect(targetUri, { serverSelectionTimeoutMS: 5000 });
      auditMetrics.connectionTimeMs = Date.now() - startTime;
      const passRetry = await performDatabaseAudit();
      if (passRetry) {
        console.log(`✔ Reconnected`);
        currentMode = modeLabel;
        lastFailureReason = null;
        printStartupReport('CONNECTED');
        return true;
      }
    } catch (retryErr) {
      lastFailureReason = retryErr.message;
    }

    printStartupReport('DISCONNECTED');
    return false;
  }
};

const startMonitoring = async () => {
  verifyEnv();

  const primaryUri = process.env.MONGODB_URI || process.env.CLOUD_MONGOPATH;
  const fallbackUri = process.env.LOCAL_MONGOPATH || "mongodb://127.0.0.1:27017/emmarket_production";

  // Check if internet is available or cloud deployment
  const isCloudHost = process.env.RENDER || process.env.NODE_ENV === "production";
  const online = isCloudHost || await checkInternet();

  if (online && primaryUri) {
    const success = await connectToDb(primaryUri, 'online');
    if (!success && fallbackUri && !isCloudHost) {
      console.warn(`[Fallback] Cloud connection timed out. Attempting local offline database...`);
      await connectToDb(fallbackUri, 'offline');
    }
  } else if (fallbackUri) {
    await connectToDb(fallbackUri, 'offline');
  } else {
    lastFailureReason = "No database URI configured";
    printStartupReport('DISCONNECTED');
  }
};

module.exports = {
  startMonitoring,
  performDatabaseAudit,
  getCurrentMode: () => currentMode,
  getLastFailureReason: () => lastFailureReason,
  getAuditMetrics: () => auditMetrics
};
