// routes/users.js
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { upload } from "../config/cloudinary.config.js";
import isAuth from "../middlewares/isAuth.middleware.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// ------------------------------
// Update username and/or password
// ------------------------------
router.patch("/update", isAuth, async (req, res) => {
  const { username, currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update username
    if (username) {
      if (!currentPassword) return res.status(400).json({ message: "Current password required to change username" });

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return res.status(400).json({ message: "Incorrect current password" });

      user.username = username;
    }

    // Update password
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ message: "Current password required to change password" });

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return res.status(400).json({ message: "Incorrect current password" });

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
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
    console.error("Update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------
// Update avatar only
// ------------------------------
router.patch("/update-avatar", isAuth, upload.single("avatar"), async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!req.file || !req.file.path) return res.status(400).json({ message: "No image uploaded" });

    user.avatar = req.file.path;
    await user.save();

    res.json({
      message: "Avatar updated successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error("Avatar upload error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
