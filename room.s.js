require("dotenv").config();
const mongoose = require("mongoose");

// Grab the URI from your .env file
const dbURI =
  "mongodb+srv://usamamehmood:usama123@cluster0.pdxuals.mongodb.net/?appName=Cluster0";

if (!dbURI) {
  console.error("❌ ERROR: MONGO_URI is not defined in your .env file!");
  process.exit(1);
}

console.log("Attempting to connect to MongoDB Atlas...");

mongoose
  .connect(dbURI)
  .then(() => {
    console.log("✅ SUCCESS: Successfully connected to MongoDB Atlas!");
    console.log("Your database is ready for deployment.");
    process.exit(0); // Exit successfully
  })
  .catch((err) => {
    console.error("❌ FAILED: Could not connect to MongoDB Atlas.");
    console.error("Error details:", err.message);
    process.exit(1); // Exit with an error
  });
