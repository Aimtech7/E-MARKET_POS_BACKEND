const express = require("express");
const {
  createInvoice,
  getInvoices,
  getInvoiceById,
  getInvoicePDF,
} = require("../controller/invoice-controller");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

// Allow reading invoices and PDFs without strict block, or lock behind auth
router.use(checkAuth);

router.post("/", createInvoice);
router.get("/", getInvoices);
router.get("/:id", getInvoiceById);
router.get("/:id/pdf", getInvoicePDF);

module.exports = router;
