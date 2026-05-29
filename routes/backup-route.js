const express = require("express");
const { triggerBackup, getBackups, triggerRestore } = require("../controller/backup-controller");
const checkAuth = require("../middleware/check-auth");
const checkAdmin = require("../middleware/check-admin");

const router = express.Router();

router.use(checkAuth);
router.use(checkAdmin);

router.post("/trigger", triggerBackup);
router.get("/", getBackups);
router.post("/restore", triggerRestore);

module.exports = router;
