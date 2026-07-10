const express = require("express");
const router = express.Router();
const { register, login, getMe, updateProfile,  investorOnlyTest } = require("../controllers/authController");
const { protect, restrictTo} = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.get("/investor-only", protect, restrictTo("investor"), investorOnlyTest);

module.exports = router;