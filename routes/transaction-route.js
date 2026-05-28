const express = require("express");
const {
  getTransactions,
  refundTransaction,
  getTransactionAnalytics,
} = require("../controller/transaction-controller");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

// Enforce auth on all operations
router.use(checkAuth);

router.get("/", getTransactions);
router.post("/refund", refundTransaction);
router.get("/analytics", getTransactionAnalytics);

module.exports = router;
