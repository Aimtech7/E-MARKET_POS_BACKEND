const express = require("express");
const {
  getTodayAnalytics,
  getWeekAnalytics,
  getMonthAnalytics,
  getProductAnalytics,
  getLowStockAnalytics,
  getNetProfit,
} = require("../controller/analytics-controller");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.use(checkAuth);

router.get("/today", getTodayAnalytics);
router.get("/week", getWeekAnalytics);
router.get("/month", getMonthAnalytics);
router.get("/products", getProductAnalytics);
router.get("/low-stock", getLowStockAnalytics);
router.get("/net-profit", getNetProfit);

module.exports = router;
