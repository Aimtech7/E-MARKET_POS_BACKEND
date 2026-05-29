const express = require("express");
const AuditLog = require("../model/AuditLog");
const checkAuth = require("../middleware/check-auth");
const checkAdmin = require("../middleware/check-admin");

const router = express.Router();

router.use(checkAuth);
router.use(checkAdmin);

router.get("/", async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
    return res.status(200).json(logs);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching audit logs", error: err.message });
  }
});

module.exports = router;
