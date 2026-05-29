const express = require("express");
const { getAllUnits, deleteUnit, updateUnit, createUnit } = require("../controller/unitOfMeasure-controller");

const checkAuth = require("../middleware/check-auth");
const checkAdmin = require("../middleware/check-admin");

const router = express.Router();

router.use(checkAuth);

router.get("/units", getAllUnits);

router.use(checkAdmin);

router.delete("/delete/:id", deleteUnit);
router.post("/update/:id", updateUnit);
router.post("/new", createUnit);


module.exports = router