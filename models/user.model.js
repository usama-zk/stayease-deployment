const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // ADDED: Now Mongoose will save the name!
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
    },
    password: { type: String, required: false }, // FIXED: Renamed to match your controller!
    role: {
      type: String,
      enum: ["guest", "user", "manager", "admin"],
      default: "user",
    },
    branch: { type: String, required: false }, // Good to have for your managers later
    phone: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
