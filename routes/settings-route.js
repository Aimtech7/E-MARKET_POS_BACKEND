const express = require("express");
const { getSettings, updateSettings } = require("../controller/settings-controller");
const checkAuth = require("../middleware/check-auth");
const checkAdmin = require("../middleware/check-admin");
const { imageUpload } = require("../middleware/file-upload");

const router = express.Router();

router.use(checkAuth);

// Anyone logged in can read settings (for receipts etc)
router.get("/", getSettings);

// Only admins can update settings
router.use(checkAdmin);
router.put("/", imageUpload.single("logo"), updateSettings);

module.exports = router;
