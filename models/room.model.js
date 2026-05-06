const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    branchLocation: {
      type: String,
      enum: ["Kaghan", "Shogran"],
      required: true,
    },
    roomIdentifier: { type: String, required: true },
    category: {
      type: String,
      enum: ["Basic", "VIP", "Deluxe"],
      required: true,
    },
    bedConfiguration: {
      type: String,
      required: true,
    },
    maxCapacity: {
      type: Number,
      required: true,
      default: 2,
    },
    pricePerNight: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// 1. Define ALL virtuals first
roomSchema.virtual("branch").get(function () {
  return this.branchLocation;
});

roomSchema.virtual("roomNumber").get(function () {
  return this.roomIdentifier;
});

roomSchema.virtual("bookedPeriods", {
  ref: "Booking",
  localField: "_id",
  foreignField: "room",
});

// 2. Enable virtuals for JSON output
roomSchema.set("toJSON", { virtuals: true });
roomSchema.set("toObject", { virtuals: true });

// 3. Compile and export the model ONLY ONCE at the very end
module.exports = mongoose.model("Room", roomSchema);
