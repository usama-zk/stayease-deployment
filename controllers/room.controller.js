const Room = require("../models/room.model"); // Ensure this points to your actual room schema

exports.getAllRoomsGlobal = async (req, res) => {
  try {
    // Fetch all 42 rooms and sort them by branch first, then room number[cite: 1]
    const rooms = await Room.find().sort({ branch: 1, roomNumber: 1 });

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching global inventory" });
  }
};

// In your room.controller.js
// controllers/room.controller.js
// controllers/room.controller.js
exports.getRoomsByCity = async (req, res) => {
  try {
    const { city } = req.params;

    const rooms = await Room.find({
      branchLocation: { $regex: new RegExp(`^${city}$`, "i") },
      isActive: true,
    }).populate({
      path: "bookedPeriods",
      select: "checkInDate checkOutDate status", // FIXED: Matched exact fields from booking.model.js
      match: { status: { $in: ["confirmed", "pending_payment"] } }, // FIXED: Use the correct lowercase enums
    });

    console.log(`Found ${rooms.length} rooms for city: ${city}`);

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
