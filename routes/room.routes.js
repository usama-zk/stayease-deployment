const express = require("express");
const router = express.Router();
const {
  getRoomsByCity,
  getAllRoomsGlobal,
} = require("../controllers/room.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

// @route   GET /api/rooms/city/:city
// @desc    Get rooms filtered by Kaghan or Shogran
// @access  Public (Guests and Users)
router.get("/city/:city", getRoomsByCity);

// @route   GET /api/rooms/all
// @desc    Get all 42 rooms for the Global Inventory Screen
// @access  Private (Admin Only)
router.get("/all", protect, authorize("admin"), getAllRoomsGlobal);

module.exports = router;
