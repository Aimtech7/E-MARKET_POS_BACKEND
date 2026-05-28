const express = require("express");
const {
  createPO,
  getPOs,
  updatePOStatus,
  deletePO,
} = require("../controller/po-controller");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.use(checkAuth);

router.post("/", createPO);
router.get("/", getPOs);
router.put("/:id/status", updatePOStatus);
router.delete("/:id", deletePO);

module.exports = router;
