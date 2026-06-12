const { app, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const mongoose = require('mongoose');

// Load environment variables if present
require('dotenv').config({ path: path.join(__dirname, '.env') });

const expressApp = require('./server'); 
const seedDefaultUsers = require("./seeds/default-users");

let mainWindow;

async function startServer() {
  const PORT = process.env.PORT || 5500;
  const MONGOPATH = process.env.MONGOPATH || "mongodb://127.0.0.1:27017/emmarket_production";

  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGOPATH);
      console.log("Connected to MongoDB from Electron.");
    }
    await seedDefaultUsers();
    
    return new Promise((resolve) => {
      expressApp.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        resolve(`http://localhost:${PORT}`);
      });
    });
  } catch (err) {
    console.error("Failed to start server", err);
    throw err;
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
