const express = require("express");
const {
  createPO,
  getPOs,
  updatePOStatus,
  deletePO,
} = require("../controller/po-controller");
const checkAuth = require("../middleware/check-auth");
const checkAdmin = require("../middleware/check-admin");

const router = express.Router();

router.use(checkAuth);

router.get("/", getPOs);

router.use(checkAdmin);

router.post("/", createPO);
router.put("/:id/status", updatePOStatus);
router.delete("/:id", deletePO);

module.exports = router;
