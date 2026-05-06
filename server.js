const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// 1. Middleware
app.use(cors());
app.use(express.json());

// Serve static folder for payment confirmation images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 2. Database Connection
const dbURI = process.env.MONGO_URI;
mongoose
  .connect(dbURI)
  .then(() => console.log("Connected to MongoDB - Ready for 42 rooms."))
  .catch((err) => console.error("Database connection error:", err));

// 3. Route Definitions
// These link to the controllers we built earlier
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/rooms", require("./routes/room.routes"));
app.use("/api/bookings", require("./routes/booking.routes"));
app.use("/api/admin", require("./routes/admin.routes"));

// 4. Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
