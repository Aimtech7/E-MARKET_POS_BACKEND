const express = require("express");
const { login, logout, me, refresh, health, version } = require("../controller/auth-controller");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

// Public Auth & Health Diagnostic Routes
router.post("/login", login);
router.post("/refresh", refresh);

// Protected Auth Routes
router.post("/logout", checkAuth, logout);
router.get("/me", checkAuth, me);

module.exports = router;
