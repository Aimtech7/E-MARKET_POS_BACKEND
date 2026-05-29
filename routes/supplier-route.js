const express = require("express");
const { getSuppliers, createSupplier, updateSupplier, deleteSupplier } = require("../controller/supplier-controller");

const checkAuth = require("../middleware/check-auth");
const checkAdmin = require("../middleware/check-admin");

const router = express.Router();

router.use(checkAuth);

router.get("/suppliers", getSuppliers);

router.use(checkAdmin);

router.post("/new", createSupplier);
router.put("/update/:id", updateSupplier);
router.delete("/delete/:id", deleteSupplier);

module.exports = router;
