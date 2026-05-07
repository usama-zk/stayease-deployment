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
// --- User Routes ---
// THE FIX: We are wrapping the upload middleware in a custom function so we can catch and read the exact Cloudinary error!
router.post(
  "/submit",
  protect,
  (req, res, next) => {
    upload.single("receipt")(req, res, (err) => {
      if (err) {
        console.error("🚨 CLOUDINARY/MULTER CRASH:", err);
        return res.status(500).json({
          success: false,
          message: "File upload failed.",
          exactError: err.message,
        });
      }
      // If upload succeeds, move on to the controller!
      next();
    });
  },
  createBooking,
);
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
