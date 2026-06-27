const { app, BrowserWindow, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const mongoose = require('mongoose');

// Load environment variables if present
require('dotenv').config({ path: path.join(__dirname, '.env') });

const expressApp = require('./server'); 
const seedDefaultUsers = require("./seeds/default-users");

let mainWindow;

async function startServer() {
  let PORT = Number(process.env.PORT || 5500);

  try {
    const connectionManager = require('./services/connection-manager');
    await connectionManager.startMonitoring();
    const syncService = require('./services/sync-service');
    syncService.startBackgroundSync();
    await seedDefaultUsers();
    
    return new Promise((resolve) => {
      const tryListen = (port) => {
        const server = expressApp.listen(port, () => {
          console.log(`[STARTUP VERIFICATION] Express API listening on active port ${port}`);
          process.env.PORT = port;
          resolve(`http://localhost:${port}`);
        });

        server.on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            console.warn(`[PORT CONFLICT] Port ${port} occupied. Attempting fallback port ${port + 1}...`);
            tryListen(port + 1);
          } else {
            console.error("[STARTUP ERROR] API listen failure:", err);
            resolve(`http://localhost:${port}`); // Fallback
          }
        });
      };

      tryListen(PORT);
    });
  } catch (err) {
    console.error("Failed to start server", err);
    return `http://localhost:${PORT}`;
  }
}

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    title: "EMMARKET POS",
    autoHideMenuBar: true
  });

  mainWindow.loadURL(url);
  mainWindow.maximize();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  try {
    const url = await startServer();
    createWindow(url);
    autoUpdater.checkForUpdatesAndNotify();
  } catch (err) {
    console.error("App initialization failed", err);
    dialog.showErrorBox("Database Connection Failed", 
      "The EMMARKET POS system failed to start because it could not connect to the database.\n\n" +
      "Error Details:\n" + err.message + "\n\n" +
      "If you are running this on a new PC offline, make sure MongoDB is installed locally, or check your internet connection if using a cloud database."
    );
    app.quit();
  }
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow(`http://localhost:${process.env.PORT || 5500}`);
  }
});
