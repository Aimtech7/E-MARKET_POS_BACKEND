const express = require("express");
const {
  getTodayAnalytics,
  getWeekAnalytics,
  getMonthAnalytics,
  getProductAnalytics,
  getLowStockAnalytics,
} = require("../controller/analytics-controller");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.use(checkAuth);

router.get("/today", getTodayAnalytics);
router.get("/week", getWeekAnalytics);
router.get("/month", getMonthAnalytics);
router.get("/products", getProductAnalytics);
router.get("/low-stock", getLowStockAnalytics);

module.exports = router;
