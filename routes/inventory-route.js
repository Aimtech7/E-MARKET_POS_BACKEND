const express = require("express");
const {
  getInventoryLogs,
  adjustStock,
  addStock,
  removeStock
} = require("../controller/inventory-controller");
const checkAuth = require("../middleware/check-auth");
const checkAdmin = require("../middleware/check-admin");

const router = express.Router();

router.use(checkAuth);

router.get("/logs", getInventoryLogs);

router.use(checkAdmin);

router.post("/adjust", adjustStock);
router.post("/add", addStock);
router.post("/remove", removeStock);

module.exports = router;
