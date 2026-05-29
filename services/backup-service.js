const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

// Extract db name from mongodb uri
const getDbName = (uri) => {
  const parts = uri.split("/");
  const dbNameWithQuery = parts[parts.length - 1];
  return dbNameWithQuery.split("?")[0];
};

const createBackup = (uri) => {
  return new Promise((resolve, reject) => {
    const dbName = getDbName(uri);
    const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(__dirname, "..", "backups", dateStr);
    
    // Ensure parent directory exists
    if (!fs.existsSync(path.join(__dirname, "..", "backups"))) {
      fs.mkdirSync(path.join(__dirname, "..", "backups"));
    }

    const command = `mongodump --uri="${uri}" --out="${backupDir}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("Backup failed:", stderr);
        return reject(error);
      }
      
      // Calculate size
      let size = 0;
      const dbBackupPath = path.join(backupDir, dbName);
      if (fs.existsSync(dbBackupPath)) {
        const files = fs.readdirSync(dbBackupPath);
        files.forEach(file => {
          const stats = fs.statSync(path.join(dbBackupPath, file));
          size += stats.size;
        });
      }
      
      resolve({ filename: dateStr, size });
    });
  });
};

const restoreBackup = (uri, backupFilename) => {
  return new Promise((resolve, reject) => {
    const dbName = getDbName(uri);
    const backupPath = path.join(__dirname, "..", "backups", backupFilename, dbName);

    if (!fs.existsSync(backupPath)) {
      return reject(new Error("Backup files not found"));
    }

    const command = `mongorestore --uri="${uri}" --drop "${backupPath}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("Restore failed:", stderr);
        return reject(error);
      }
      resolve(true);
    });
  });
};

module.exports = {
  createBackup,
  restoreBackup
};
