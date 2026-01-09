import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { upload } from "../config/cloudinary.config.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Update user profile
router.patch("/update", upload.single("profilePic"), async (req, res) => {
  const { username, currentPassword, newPassword } = req.body;
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Not authenticated" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update username if provided
    if (username) user.username = username;

    // Update password if currentPassword and newPassword provided
    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    // Update avatar if profilePic uploaded
    if (req.file && req.file.path) {
      user.avatar = req.file.path;
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error("Error updating profile:", err.message);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

export default router;