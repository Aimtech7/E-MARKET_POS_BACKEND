const express = require("express");
const {
  searchCustomer,
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerPurchaseHistory,
} = require("../controller/customer-controller");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.use(checkAuth);

router.get("/search", searchCustomer);
router.get("/", getAllCustomers);
router.get("/:id", getCustomerById);
router.get("/:id/history", getCustomerPurchaseHistory);
router.post("/new", createCustomer);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);

module.exports = router;
