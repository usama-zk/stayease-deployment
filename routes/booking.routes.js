const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload.middleware");

const { protect, authorize } = require("../middleware/auth.middleware");

// FIXED: Added createManualBooking and processCancellation to the imports
const {
  createBooking,
  getPendingBookings,
  updateBookingStatus,
  getConfirmedRoster,
  getMyBookings,
  checkAvailability,
  getActiveDiscounts,
  createManualBooking,
  processCancellation,
} = require("../controllers/booking.controller");

// --- User Routes ---
router.post("/submit", protect, upload.single("receipt"), createBooking);
router.get("/my-bookings", protect, getMyBookings);
router.post("/check-availability", checkAvailability);

// FIXED: Added the cancellation route the Flutter app is looking for
router.patch("/cancel/:bookingId", protect, processCancellation);

// --- Manager Routes ---
router.get("/pending", protect, authorize("manager"), getPendingBookings);
router.patch("/status", protect, authorize("manager"), updateBookingStatus);
router.get("/roster", protect, authorize("manager"), getConfirmedRoster);

// FIXED: Added the manual booking route for the manager's walk-in feature
router.post("/manual", protect, authorize("manager"), createManualBooking);

router.get("/discounts", getActiveDiscounts);

module.exports = router;
