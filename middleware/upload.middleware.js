const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

// 1. Configure Cloudinary with your .env credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Set up the Cloudinary storage engine
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "stayease_payments", // Creates a specific folder in your Cloudinary account
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

// 3. Export the upload middleware
const upload = multer({ storage });
module.exports = upload;