const Backup = require("../model/Backup");
const { createBackup, restoreBackup } = require("../services/backup-service");

const triggerBackup = async (req, res) => {
  const username = req.userData ? req.userData.username : "Admin";
  try {
    const uri = process.env.MONGOPATH;
    const { filename, size } = await createBackup(uri);
    
    const backup = new Backup({
      filename,
      size,
      status: "Success",
      triggeredBy: username
    });
    
    await backup.save();
    return res.status(200).json({ message: "Backup completed successfully", backup });
  } catch (err) {
    const failedBackup = new Backup({
      filename: `Failed-${Date.now()}`,
      status: "Failed",
      triggeredBy: username
    });
    await failedBackup.save();
    return res.status(500).json({ message: "Backup failed", error: err.message });
  }
};

const getBackups = async (req, res) => {
  try {
    const backups = await Backup.find().sort({ timestamp: -1 });
    return res.status(200).json(backups);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching backups", error: err.message });
  }
};

const triggerRestore = async (req, res) => {
  const { filename } = req.body;
  if (!filename) {
    return res.status(400).json({ message: "Filename is required" });
  }

  try {
    const uri = process.env.MONGOPATH;
    await restoreBackup(uri, filename);
    return res.status(200).json({ message: "Database restored successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Restore failed", error: err.message });
  }
};

module.exports = {
  triggerBackup,
  getBackups,
  triggerRestore
};
