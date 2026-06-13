const mongoose = require('mongoose');
const dns = require('dns');

const CLOUD_URI = process.env.CLOUD_MONGOPATH;
const LOCAL_URI = process.env.LOCAL_MONGOPATH || "mongodb://127.0.0.1:27017/emmarket_production";
const CHECK_INTERVAL_MS = 10000; // 10 seconds

let isOnline = false;
let currentMode = null; // 'cloud' or 'local'

const checkInternet = () => {
  return new Promise((resolve) => {
    dns.lookup('google.com', (err) => {
      if (err && err.code == "ENOTFOUND") {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
};

const connectToDb = async (mode) => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    const uri = mode === 'cloud' ? CLOUD_URI : LOCAL_URI;
    if (!uri) {
      console.warn(`[ConnectionManager] Cannot connect to ${mode} because URI is undefined.`);
      return false;
    }
    
    await mongoose.connect(uri);
    currentMode = mode;
    console.log(`[ConnectionManager] Successfully connected to ${mode.toUpperCase()} database.`);
    
    if (mode === 'cloud') {
      // Trigger sync upload when we come back online
      try {
        const syncService = require('./sync-service');
        if (syncService && syncService.pushOfflineData) {
          syncService.pushOfflineData().catch(console.error);
        }
      } catch (e) {
        // sync-service might not be fully implemented yet
        console.warn("[ConnectionManager] Sync service not found or threw error:", e.message);
      }
    }
    return true;
  } catch (err) {
    console.error(`[ConnectionManager] Failed to connect to ${mode} database:`, err.message);
    if (process.env.RENDER) {
      console.error("FATAL: Cannot connect to MongoDB in production. Server will crash to prevent 503 errors.");
      process.exit(1);
    }
    return false;
  }
};

const startMonitoring = async () => {
  // If we are on Render or production, always use cloud if available
  if (process.env.RENDER || process.env.NODE_ENV === "production" || process.env.CLOUD_MONGOPATH) {
    if (CLOUD_URI) {
      console.log("[ConnectionManager] Cloud environment detected. Connecting to CLOUD_URI...");
      await connectToDb('cloud');
      isOnline = true;
    } else {
      console.warn("[ConnectionManager] Cloud environment but CLOUD_MONGOPATH is not set! Trying local...");
      await connectToDb('local');
      isOnline = false;
    }
  } else {
    // Initial connection for local desktop app
    const online = await checkInternet();
    if (online && CLOUD_URI) {
      await connectToDb('cloud');
      isOnline = true;
    } else {
      await connectToDb('local');
      isOnline = false;
    }
  }

  // Skip periodic internet checks if running in the cloud
  if (process.env.RENDER || process.env.NODE_ENV === "production" || process.env.CLOUD_MONGOPATH) {
    console.log("[ConnectionManager] Cloud environment detected. Disabling periodic internet checks.");
    return;
  }

  // Set up interval for local desktop app only
  setInterval(async () => {
    const currentlyOnline = await checkInternet();
    
    // Status changed from Offline -> Online
    if (currentlyOnline && !isOnline) {
      console.log("[ConnectionManager] Internet restored. Switching to CLOUD mode...");
      isOnline = true;
      if (CLOUD_URI) await connectToDb('cloud');
    } 
    // Status changed from Online -> Offline
    else if (!currentlyOnline && isOnline) {
      console.log("[ConnectionManager] Internet connection lost. Switching to LOCAL mode...");
      isOnline = false;
      await connectToDb('local');
    }
  }, CHECK_INTERVAL_MS);
};

module.exports = {
  startMonitoring,
  getCurrentMode: () => currentMode
};
