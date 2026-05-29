const express = require("express");
const {
  createDebt,
  recordPayment,
  getCustomerDebts,
  getAllDebts,
  getDebtStatement,
} = require("../controller/debt-controller");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.use(checkAuth);

router.get("/", getAllDebts);
router.get("/customer/:customerId", getCustomerDebts);
router.get("/:id", getDebtStatement);
router.post("/", createDebt);
router.post("/:id/pay", recordPayment);

module.exports = router;
