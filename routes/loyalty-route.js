const express = require("express");
const { getCustomerLoyalty, redeemLoyaltyPoints, awardPurchasePoints } = require("../controller/loyalty-controller");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.use(checkAuth);

router.get("/:phone", getCustomerLoyalty);
router.post("/redeem", redeemLoyaltyPoints);
router.post("/award", awardPurchasePoints);

module.exports = router;
