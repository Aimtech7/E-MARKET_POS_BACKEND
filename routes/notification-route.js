const express = require("express");
const { getNotifications, markAsRead, markAllAsRead } = require("../controller/notification-controller");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.use(checkAuth);

router.get("/", getNotifications);
router.put("/mark-all-read", markAllAsRead);
router.put("/:id/read", markAsRead);

module.exports = router;
