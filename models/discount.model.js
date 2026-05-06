const mongoose = require("mongoose");

const discountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true, // e.g., 'EARLY_BIRD', 'LONG_STAY'
    },
    percentage: {
      type: Number,
      required: true,
      default: 0, // e.g., 10 for 10% off
    },
    isActive: {
      type: Boolean,
      default: false, // Admins can toggle this on/off from the dashboard
    },
    minNights: { type: Number, default: 0 },
    minDaysInAdvance: { type: Number, default: 0 },
  },

  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Discount", discountSchema);
