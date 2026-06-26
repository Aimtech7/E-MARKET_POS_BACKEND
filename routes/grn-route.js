const express = require("express");
const router = express.Router();
const checkAuth = require("../middleware/check-auth");
const ctrl = require("../controller/grn-controller");

router.use(checkAuth);
router.get("/", ctrl.getGrns);
router.post("/new", ctrl.createGrn);
router.post("/complete/:id", ctrl.completeGrnReceiving);

module.exports = router;
