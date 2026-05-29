const express = require("express");
const {
  createReceipt,
  getReceipts,
  getReceiptById,
  getReceiptPDF,
} = require("../controller/receipt-controller");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.use(checkAuth);

router.post("/", createReceipt);
router.get("/", getReceipts);
router.get("/:id", getReceiptById);
router.get("/:id/pdf", getReceiptPDF);

module.exports = router;
