const express = require("express");
const {
  getAllCategories,
  deleteCategory,
  createCategory,
  updateCategory,
} = require("../controller/category-controller");

const checkAuth = require("../middleware/check-auth");
const checkAdmin = require("../middleware/check-admin");

const router = express.Router();

router.use(checkAuth);

router.get("/categories", getAllCategories);

router.use(checkAdmin);

router.delete("/delete/:id", deleteCategory);
router.post("/update/:id", updateCategory);
router.post("/new", createCategory);

module.exports = router;
