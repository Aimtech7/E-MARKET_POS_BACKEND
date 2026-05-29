const express = require("express");
const { getClosureData, submitClosure, getClosures } = require("../controller/closure-controller");
const checkAuth = require("../middleware/check-auth");
const checkAdmin = require("../middleware/check-admin");

const router = express.Router();

router.use(checkAuth);

router.get("/data", getClosureData);
router.post("/submit", submitClosure);

router.use(checkAdmin);
router.get("/", getClosures);

module.exports = router;
