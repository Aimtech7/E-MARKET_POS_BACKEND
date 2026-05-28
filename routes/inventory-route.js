const express = require("express");
const {
  getInventoryLogs,
  adjustStock,
} = require("../controller/inventory-controller");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.use(checkAuth);

router.get("/logs", getInventoryLogs);
router.post("/adjust", adjustStock);

module.exports = router;
