const Booking = require("../models/booking.model");
const Room = require("../models/room.model");
const User = require("../models/user.model");
const Discount = require("../models/discount.model");
// 1. YOUR EXISTING LOGIC (KEEP AS IS)
exports.checkAvailability = async (req, res) => {
  try {
    const { roomId, checkIn, checkOut } = req.body;
    const requestedStart = new Date(checkIn);
    const requestedEnd = new Date(checkOut);

    if (requestedStart >= requestedEnd) {
      return res.status(400).json({
        success: false,
        error: "Check-out date must be after the check-in date.",
      });
    }

    const overlappingBookings = await Booking.find({
      room: roomId,
      status: { $in: ["pending_payment", "confirmed"] }, // Crucial for manual flow
      checkInDate: { $lt: requestedEnd },
      checkOutDate: { $gt: requestedStart },
    }).sort({ checkInDate: 1 });

    if (overlappingBookings.length === 0) {
      return res.status(200).json({
        success: true,
        isFullyAvailable: true,
        message: "Room is available for the entire duration.",
        availableBlocks: [{ start: requestedStart, end: requestedEnd }],
      });
    }

    let availableBlocks = [];
    let currentPointer = requestedStart;

    overlappingBookings.forEach((booking) => {
      const bookingStart = new Date(booking.checkInDate);
      const bookingEnd = new Date(booking.checkOutDate);

      if (currentPointer < bookingStart) {
        availableBlocks.push({ start: currentPointer, end: bookingStart });
      }
      if (currentPointer < bookingEnd) {
        currentPointer = bookingEnd;
      }
    });

    if (currentPointer < requestedEnd) {
      availableBlocks.push({ start: currentPointer, end: requestedEnd });
    }

    return res.status(200).json({
      success: true,
      isFullyAvailable: false,
      message: "Room is partially booked. See available windows.",
      availableBlocks: availableBlocks,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server error." });
  }
};

// 2. NEW LOGIC: SUBMIT BOOKING WITH IMAGE [cite: 26]
// 2. NEW LOGIC: SUBMIT BOOKING WITH IMAGE
exports.createBooking = async (req, res) => {
  console.log("=== INCOMING UPLOAD REQUEST ===");
  console.log("REQ.BODY:", req.body);
  console.log("REQ.FILE:", req.file);

  try {
    const { roomId, checkIn, checkOut, totalAmount } = req.body;

    if (!req.file) {
      console.log("FAILED: req.file is missing or rejected");
      return res
        .status(400)
        .json({ success: false, message: "Receipt image required." });
    }

    // THE FIX: Cloudinary gives us the live URL directly!
    const liveImageUrl = req.file.path;

    const newBooking = new Booking({
      user: req.user.id,
      room: roomId,
      checkInDate: new Date(checkIn),
      checkOutDate: new Date(checkOut),
      totalAmount: totalAmount,
      paymentReceiptUrl: liveImageUrl, // <-- Saving the permanent Cloudinary URL
      status: "pending_payment",
    });

    await newBooking.save();
    console.log("SUCCESS: Booking saved to MongoDB!");

    res.status(201).json({
      success: true,
      message: "Booking submitted!",
      bookingId: newBooking._id,
    });
  } catch (error) {
    console.error("=== DATABASE CRASH ===");
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Error saving booking.",
      exactError: error.message,
    });
  }
};
// Get all bookings that need approval for a specific branch
exports.getPendingBookings = async (req, res) => {
  try {
    const managerBranch = req.user.branch;

    const pendingBookings = await Booking.find({ status: "pending_payment" })
      .populate({
        path: "room",
        match: { branchLocation: managerBranch },
      })
      .populate("user", "name email");

    // Filter out null rooms
    const filteredBookings = pendingBookings.filter(
      (b) => b && b.room !== null,
    );

    res.status(200).json({ success: true, data: filteredBookings });
  } catch (error) {
    // This will print the exact crash reason to your Node terminal!
    console.error("PENDING API CRASH:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching pending bookings." });
  }
};

exports.getConfirmedRoster = async (req, res) => {
  try {
    const managerBranch = req.user.branch;

    const roster = await Booking.find({ status: "confirmed" })
      .populate({
        path: "room",
        match: { branchLocation: managerBranch },
      })
      .populate("user", "name email")
      .sort({ checkInDate: 1 });

    const filteredRoster = roster.filter((b) => b && b.room !== null);

    res.status(200).json({ success: true, data: filteredRoster });
  } catch (error) {
    console.error("ROSTER API CRASH:", error);
    res.status(500).json({ success: false, message: "Error fetching roster." });
  }
};

// Update booking status (Approve/Reject)
exports.updateBookingStatus = async (req, res) => {
  try {
    const { bookingId, status } = req.body; // status: 'confirmed' or 'cancelled'

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status },
      { new: true },
    );

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update failed." });
  }
};
exports.getMyBookings = async (req, res) => {
  try {
    // Find all bookings for the logged-in user
    const myBookings = await Booking.find({ user: req.user.id })
      .populate("room") // Get category, price, and branch info
      .sort({ createdAt: -1 }); // Show newest first

    res.status(200).json({
      success: true,
      data: myBookings,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching your history." });
  }
};
exports.processCancellation = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found." });
    }

    const now = new Date();
    const checkIn = new Date(booking.checkInDate);

    // Calculate difference in milliseconds, then convert to hours
    const diffInMs = checkIn - now;
    const diffInHours = diffInMs / (1000 * 60 * 60);

    let refundPercentage = 0;
    let refundAmount = 0;

    // FIXED: Matching the project statement's 3-day / 2-day policy
    if (diffInHours >= 72) {
      refundPercentage = 100;
    } else if (diffInHours >= 48) {
      refundPercentage = 50;
    } else {
      refundPercentage = 0;
    }

    refundAmount = (booking.totalAmount * refundPercentage) / 100;

    // Update the booking status
    booking.status = "cancelled";
    booking.refundAmount = refundAmount; // Ensure your Model has this field
    await booking.save();

    res.status(200).json({
      success: true,
      message: `Booking cancelled. Refund of ${refundPercentage}% processed.`,
      data: {
        totalPaid: booking.totalAmount,
        refundAmount: refundAmount,
        percentage: refundPercentage,
      },
    });
  } catch (error) {
    console.error("Cancellation Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error during cancellation." });
  }
};

// controllers/bookingController.js

exports.createManualBooking = async (req, res) => {
  try {
    const { roomId, guestName, checkIn, checkOut, totalAmount } = req.body;
    const managerBranch = req.user.branch; // From Auth Middleware [cite: 28]

    // Verify the room belongs to the manager's branch [cite: 5, 8]
    const room = await Room.findById(roomId);
    // FIXED: Was room.branch
    if (!room || room.branchLocation !== managerBranch) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized for this branch." });
    }

    const newBooking = new Booking({
      user: null, // No app user account for on-call bookings
      guestName: guestName, // Store name directly for manual entries
      room: roomId,
      checkInDate: new Date(checkIn),
      checkOutDate: new Date(checkOut),
      totalAmount: totalAmount,
      status: "confirmed", // Automatically confirmed by manager
      isManual: true,
    });

    await newBooking.save();
    res.status(201).json({ success: true, message: "Manual booking created." });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error creating manual booking." });
  }
};
exports.getActiveDiscounts = async (req, res) => {
  try {
    const discounts = await Discount.find({ isActive: true });
    res.status(200).json({ success: true, data: discounts });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error fetching discounts" });
  }
};
