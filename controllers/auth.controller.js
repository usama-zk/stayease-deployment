const mongoose = require("mongoose");
const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// FIXED 3: Added 'branch' to generateToken
const generateToken = (id, role, branch) => {
  // 1. Check if the secret exists first
  if (!process.env.JWT_SECRET) {
    throw new Error(
      "FATAL ERROR: JWT_SECRET is not defined in environment variables.",
    );
  }

  // 2. Sign the token securely
  return jwt.sign(
    { id, role, branch },
    process.env.JWT_SECRET, // No fallback!
    { expiresIn: "7d" },
  );
};

// FIXED 1: Added the missing signup export
exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword, // Make sure your User model field is named 'password'
      role: "user",
    });

    res.status(201).json({
      success: true,
      token: generateToken(user._id, user.role, user.branch),
      user: { id: user._id, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("CRITICAL SIGNUP ERROR:", error);

    res.status(500).json({ message: "Server error during signup" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    // FIXED 2: Checked against 'user.password' instead of 'user.passwordHash'
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(user._id, user.role, user.branch);

    res.status(200).json({
      success: true,
      token,
      user: { email: user.email, role: user.role, branch: user.branch },
    });
  } catch (error) {
    console.error("CRITICAL LOGIN ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.guestLogin = async (req, res) => {
  try {
    const dummyGuestId = new mongoose.Types.ObjectId();

    // Guest doesn't need a branch, so we pass null
    const token = generateToken(dummyGuestId, "guest", null);

    res.status(200).json({
      success: true,
      token,
      user: { role: "guest" },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
