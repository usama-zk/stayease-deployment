const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    // FIXED: Changed required to false so walk-in guests don't crash the database
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    // FIXED: Added fields specifically for Manager Manual Bookings
    guestName: { type: String, required: false },
    isManual: { type: Boolean, default: false },

    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },

    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date, required: true },

    status: {
      type: String,
      enum: ["pending_payment", "confirmed", "cancelled", "completed"],
      default: "pending_payment",
    },

    totalAmount: { type: Number, required: true },
    paymentReceiptUrl: { type: String },
    paymentVerifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    appliedDiscount: { type: mongoose.Schema.Types.ObjectId, ref: "Discount" },
    cancellationDate: { type: Date },

    refundAmount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Booking", bookingSchema);
