const Booking = require("../models/booking.model");
const Room = require("../models/room.model");
const User = require("../models/user.model");
const Discount = require("../models/discount.model");

// 1. Check Room Availability
exports.checkAvailability = async (req, res) => {
  try {
    const { roomId, checkIn, checkOut } = req.body;
    const requestedStart = new Date(checkIn);
    const requestedEnd = new Date(checkOut);

    if (requestedStart >= requestedEnd) {
      return res.status(400).json({
        success: false,
        message: "Check-out date must be after the check-in date.",
      });
    }

    const overlappingBookings = await Booking.find({
      room: roomId,
      status: { $in: ["pending_payment", "confirmed"] },
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
    console.error("Availability Check Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error checking availability." });
  }
};

// 2. Submit Booking With Image
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

    const liveImageUrl = req.file.path;

    const newBooking = new Booking({
      user: req.user.id,
      room: roomId,
      checkInDate: new Date(checkIn),
      checkOutDate: new Date(checkOut),
      totalAmount: totalAmount,
      paymentReceiptUrl: liveImageUrl,
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
    console.error("=== DATABASE CRASH ===", error);
    res.status(500).json({
      success: false,
      message: "Error saving booking.",
      exactError: error.message,
    });
  }
};

// 3. Get Pending Bookings (Admin/Manager)
exports.getPendingBookings = async (req, res) => {
  try {
    const managerBranch = req.user.branch;

    const pendingBookings = await Booking.find({ status: "pending_payment" })
      .populate({
        path: "room",
        match: { branchLocation: managerBranch },
      })
      .populate("user", "name email");

    const filteredBookings = pendingBookings.filter(
      (b) => b && b.room !== null,
    );

    res.status(200).json({ success: true, data: filteredBookings });
  } catch (error) {
    console.error("PENDING API CRASH:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching pending bookings." });
  }
};

// 4. Get Confirmed Roster (Admin/Manager)
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

// 5. Update Booking Status (Approve/Reject)
exports.updateBookingStatus = async (req, res) => {
  try {
    const { bookingId, status } = req.body;

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status },
      { new: true },
    );

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    console.error("Status Update Error:", error);
    res.status(500).json({ success: false, message: "Update failed." });
  }
};

// 6. Get Logged-in User's Bookings
exports.getMyBookings = async (req, res) => {
  try {
    const myBookings = await Booking.find({ user: req.user.id })
      .populate("room")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: myBookings });
  } catch (error) {
    console.error("My Bookings Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching your history." });
  }
};

// 7. Process Booking Cancellation
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
    const diffInMs = checkIn - now;
    const diffInHours = diffInMs / (1000 * 60 * 60);

    let refundPercentage = 0;
    if (diffInHours >= 72) {
      refundPercentage = 100;
    } else if (diffInHours >= 48) {
      refundPercentage = 50;
    } else {
      refundPercentage = 0;
    }

    const refundAmount = (booking.totalAmount * refundPercentage) / 100;

    booking.status = "cancelled";
    booking.refundAmount = refundAmount;
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

// 8. Create Manual Booking (Admin)
exports.createManualBooking = async (req, res) => {
  try {
    const { roomId, guestName, checkIn, checkOut, totalAmount } = req.body;
    const managerBranch = req.user.branch;

    const room = await Room.findById(roomId);
    if (!room || room.branchLocation !== managerBranch) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized for this branch." });
    }

    const newBooking = new Booking({
      user: null,
      guestName: guestName,
      room: roomId,
      checkInDate: new Date(checkIn),
      checkOutDate: new Date(checkOut),
      totalAmount: totalAmount,
      status: "confirmed",
      isManual: true,
    });

    await newBooking.save();
    res.status(201).json({ success: true, message: "Manual booking created." });
  } catch (error) {
    console.error("Manual Booking Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error creating manual booking." });
  }
};

// 9. Get Active Discounts
exports.getActiveDiscounts = async (req, res) => {
  try {
    const discounts = await Discount.find({ isActive: true });
    res.status(200).json({ success: true, data: discounts });
  } catch (error) {
    console.error("Discounts Fetch Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error fetching discounts." });
  }
};
