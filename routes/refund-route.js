const express = require("express");
const { processRefund, getRefunds } = require("../controller/refund-controller");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.use(checkAuth);

router.post("/process", processRefund);
router.get("/", getRefunds);

module.exports = router;
