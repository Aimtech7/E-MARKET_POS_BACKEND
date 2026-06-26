const express = require("express");
const router = express.Router();
const checkAuth = require("../middleware/check-auth");
const ctrl = require("../controller/quotation-controller");

router.use(checkAuth);
router.get("/", ctrl.getQuotations);
router.post("/new", ctrl.createQuotation);
router.put("/status/:id", ctrl.updateQuotationStatus);
router.post("/convert/:id", ctrl.convertQuotationToInvoice);

module.exports = router;
