const Booking = require("../models/booking.model");
const Room = require("../models/room.model");
const Discount = require("../models/discount.model");
const User = require("../models/user.model");
exports.getGlobalStats = async (req, res) => {
  try {
    // 1. Total Inventory (Should be 42)
    const totalRooms = await Room.countDocuments();

    // 2. Active/Confirmed Bookings
    const activeBookings = await Booking.countDocuments({
      status: "confirmed",
    });

    // 3. Pending Payment Verifications
    const pendingVerifications = await Booking.countDocuments({
      status: "pending_payment",
    });

    // 4. Total Monthly Revenue
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const revenueData = await Booking.aggregate([
      {
        $match: {
          status: "confirmed",
          createdAt: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    const monthlyRevenue =
      revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    res.status(200).json({
      success: true,
      stats: {
        totalRooms,
        activeBookings,
        pendingVerifications,
        monthlyRevenue,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching admin statistics." });
  }
};

exports.calculateRefund = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);

    const now = new Date();
    const checkIn = new Date(booking.checkInDate);
    const diffInHours = (checkIn - now) / (1000 * 60 * 60);

    let refundPercentage = 0;

    // FIXED: 72 hours = 3 days, 48 hours = 2 days
    if (diffInHours >= 72) {
      refundPercentage = 100; // Full refund if cancelled 3+ days before
    } else if (diffInHours >= 48) {
      refundPercentage = 50; // Half refund if cancelled 2 days before
    } else {
      refundPercentage = 0; // No refund if cancelled less than 48h before
    }

    res.status(200).json({
      success: true,
      refundAmount: (booking.totalAmount * refundPercentage) / 100,
      percentage: refundPercentage,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Calculation failed" });
  }
};

exports.getAllDiscounts = async (req, res) => {
  try {
    const discounts = await Discount.find();
    res.status(200).json({ success: true, data: discounts });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error fetching all discounts" });
  }
};

// UPDATED: Save the new fields
exports.updateDiscountRule = async (req, res) => {
  try {
    const { ruleName, percentage, isActive, minNights, minDaysInAdvance } =
      req.body;

    const rule = await Discount.findOneAndUpdate(
      { name: ruleName },
      // Update now includes the new dynamic conditions
      { percentage, isActive, minNights, minDaysInAdvance },
      { new: true, upsert: true },
    );

    res.status(200).json({ success: true, data: rule });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error updating discount rule" });
  }
};
exports.assignManager = async (req, res) => {
  try {
    const { email, branch } = req.body;

    // FIXED: Strict validation to prevent "branchless" managers from crashing the system
    if (!branch || (branch !== "Kaghan" && branch !== "Shogran")) {
      return res.status(400).json({
        success: false,
        message:
          "A valid branch (Kaghan or Shogran) is required to assign a manager.",
      });
    }

    const user = await User.findOneAndUpdate(
      { email },
      { role: "manager", branch },
      { new: true }, // Returns the updated document
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error assigning manager role." });
  }
};
