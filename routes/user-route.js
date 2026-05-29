const express = require("express");
;
const { getUsers, login, createUser, deleteUser } = require("../controller/user-controller");
const checkAuth = require("../middleware/check-auth");
const checkAdmin = require("../middleware/check-admin");

const router = express.Router();

router.post("/login", login);

router.use(checkAuth);
router.use(checkAdmin);

router.get("/users", getUsers);
router.post("/create", createUser);
router.delete("/delete/:id", deleteUser);


module.exports = router;
