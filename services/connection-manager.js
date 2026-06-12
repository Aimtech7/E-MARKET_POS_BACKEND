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
    return false;
  }
};

const startMonitoring = async () => {
  // Initial connection
  const online = await checkInternet();
  if (online && CLOUD_URI) {
    await connectToDb('cloud');
    isOnline = true;
  } else {
    await connectToDb('local');
    isOnline = false;
  }

  // Set up interval
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
