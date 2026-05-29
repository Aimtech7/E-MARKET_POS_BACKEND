const express = require("express");
const { checkCart, getCarts } = require("../controller/cart-controller");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();
router.use(checkAuth);

router.get("/carts", getCarts);
router.post("/check", checkCart);
module.exports = router;
