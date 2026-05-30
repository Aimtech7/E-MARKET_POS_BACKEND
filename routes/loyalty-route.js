const express = require("express");
const checkAuth = require("../middleware/check-auth");
const loyaltyController = require("../controller/loyalty-controller");

const router = express.Router();

router.post("/add", checkAuth, loyaltyController.addLoyaltyPoints);
router.post("/redeem", checkAuth, loyaltyController.redeemLoyaltyPoints);
router.get("/dashboard", checkAuth, loyaltyController.getLoyaltyDashboard);
router.get("/customer/:customerId", checkAuth, loyaltyController.getCustomerLoyalty);

module.exports = router;
