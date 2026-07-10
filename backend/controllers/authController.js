const jwt = require("jsonwebtoken");
const User = require("../models/user");

// Helper to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// @route   POST /api/auth/register
// @desc    Register a new user
exports.register = async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const user = await User.create({
      fullName,
      email,
      password, // hashed automatically by the pre-save hook in the model
      role: role || "entrepreneur",
    });

    const token = generateToken(user);

    res.status(201).json({
      message: "Registration successful",
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

// @route   POST /api/auth/login
// @desc    Login existing user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);

    res.status(200).json({
      message: "Login successful",
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

// @route   GET /api/auth/me
// @desc    Get currently logged-in user's profile (requires auth middleware)
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user: user.toSafeObject() });
  } catch (error) {
    console.error("GetMe error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @route   PUT /api/auth/profile
// @desc    Update logged-in user's profile
exports.updateProfile = async (req, res) => {
  try {
    const allowedUpdates = [
      "fullName",
      "bio",
      "profileImage",
      "location",
      "phone",
      "startupInfo",
      "investorInfo",
    ];

    const updates = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Profile updated successfully",
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error updating profile" });
  }
};
// @route   GET /api/auth/investor-only
// @desc    Test route restricted to investors only
exports.investorOnlyTest = async (req, res) => {
  res.status(200).json({ message: "Welcome, investor! You have access." });
};