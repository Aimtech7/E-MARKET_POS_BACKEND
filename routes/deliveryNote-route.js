const express = require("express");
const router = express.Router();
const checkAuth = require("../middleware/check-auth");
const ctrl = require("../controller/deliveryNote-controller");

router.use(checkAuth);
router.get("/", ctrl.getDeliveryNotes);
router.post("/new", ctrl.createDeliveryNote);
router.put("/status/:id", ctrl.updateDeliveryStatus);
router.get("/print/:id", ctrl.printDeliveryNotePdf);

module.exports = router;
