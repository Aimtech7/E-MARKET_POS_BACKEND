const express = require("express");
const { getSalesCSV, getInventoryCSV, getProfitCSV, getSalesChartData } = require("../controller/report-controller");
const checkAuth = require("../middleware/check-auth");
const checkAdmin = require("../middleware/check-admin");

const router = express.Router();

router.use(checkAuth);
router.use(checkAdmin);

router.get("/sales/csv", getSalesCSV);
router.get("/inventory/csv", getInventoryCSV);
router.get("/profit/csv", getProfitCSV);
router.get("/chart", getSalesChartData);

module.exports = router;
