const express = require("express");
const {
  createSupplier,
  getSuppliers,
  updateSupplier,
  deleteSupplier,
} = require("../controller/supplier-controller");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.use(checkAuth);

router.post("/", createSupplier);
router.get("/", getSuppliers);
router.put("/:id", updateSupplier);
router.delete("/:id", deleteSupplier);

module.exports = router;
