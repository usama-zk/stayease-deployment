const express = require("express");
const router = express.Router();
const { signup, login, guestLogin } = require("../controllers/auth.controller");

// POST /api/auth/signup
router.post("/signup", signup);

// POST /api/auth/login
router.post("/login", login);

router.post("/guest-login", guestLogin);

module.exports = router;
