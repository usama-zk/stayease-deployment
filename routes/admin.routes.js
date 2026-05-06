const express = require("express");
const router = express.Router();
const {
  getGlobalStats,
  updateDiscountRule,
  assignManager,
  getAllDiscounts,
} = require("../controllers/admin.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

// Apply protection to ALL routes in this file
router.use(protect);
router.use(authorize("admin")); // Only Admins allowed beyond this point

// @route   GET /api/admin/stats
// @desc    Fetch total revenue, 42-room occupancy, and pending verifications
router.get("/stats", getGlobalStats);

// @route   PUT /api/admin/discount
// @desc    Update predefined rules like Early Bird (10%) or Long Stay (15%)
router.put("/discount", updateDiscountRule);
// Add the route (already protected by your admin middleware)
// @route   PUT /api/admin/assign-manager
// @desc    Promote a user to a branch manager
router.put("/assign-manager", assignManager);
router.get("/discounts", getAllDiscounts);
module.exports = router;
