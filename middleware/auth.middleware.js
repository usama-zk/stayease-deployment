const jwt = require("jsonwebtoken");

exports.protect = (req, res, next) => {
  let token = req.headers.authorization;
  if (token && token.startsWith("Bearer")) {
    token = token.split(" ")[1];
  }

  if (!token) return res.status(401).json({ message: "Not authorized" });

  try {
    // FIXED: Added the exact same fallback secret used in your controller
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback_secret",
    );

    req.user = decoded; // Contains id and role
    next();
  } catch (error) {
    // Optional: Print the real JWT error to your console so you know if it expired or was mangled
    console.error("JWT Verification Error:", error.message);
    res.status(401).json({ message: "Token failed" });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Access denied: Insufficient permissions" });
    }
    next();
  };
};

// Usage on a route:
// router.get('/manager/bookings', protect, authorize('manager', 'admin'), getManagerBookings);
