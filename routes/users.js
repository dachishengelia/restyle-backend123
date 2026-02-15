// routes/users.js
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";
import Product from "../models/Product.js";
import CV from "../models/CV.js";
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

// ------------------------------
// GET USER PROFILE
// ------------------------------
router.get("/:userId/profile", async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const user = await User.findById(userId).select("_id username avatar bio role createdAt");
    if (!user) return res.status(404).json({ message: "User not found" });

    const productCount = await Product.countDocuments({ sellerId: userId });
    const cvCount = await CV.countDocuments({ userId });

    res.json({
      _id: user._id,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      role: user.role,
      createdAt: user.createdAt,
      productCount,
      cvCount
    });
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------
// GET USER'S PRODUCTS
// ------------------------------
router.get("/:userId/products", async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10, sort = "newest" } = req.query;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    let sortStage = {};
    if (sort === "newest") sortStage = { createdAt: -1 };
    else if (sort === "oldest") sortStage = { createdAt: 1 };
    else if (sort === "most-liked") sortStage = { likesCount: -1 };

    const products = await Product.aggregate([
      { $match: { sellerId: new mongoose.Types.ObjectId(userId) } },
      { $addFields: { likesCount: { $size: "$likes" } } },
      { $sort: sortStage },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "sellerId",
          foreignField: "_id",
          as: "seller"
        }
      },
      { $unwind: "$seller" },
      { $project: { "seller.password": 0, "seller.cart": 0, "seller.favorites": 0, "seller.userFavorites": 0 } }
    ]);

    const total = await Product.countDocuments({ sellerId: userId });

    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    console.error("User products fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------
// GET USER'S FAVORITES (PRODUCTS)
// ------------------------------
router.get("/:userId/favorites", async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const user = await User.findById(userId).populate("favorites");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user.favorites);
  } catch (err) {
    console.error("User favorites fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------
// GET USER'S COMMENTS
// ------------------------------
router.get("/:userId/comments", async (req, res) => {
  const { userId } = req.params;
  const { limit = 3 } = req.query;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const products = await Product.find({ "comments.userId": userId })
      .select("comments name")
      .sort({ "comments.createdAt": -1 })
      .limit(limit * 1)
      .lean();

    const comments = [];
    products.forEach(product => {
      product.comments.forEach(comment => {
        if (comment.userId.toString() === userId) {
          comments.push({
            ...comment,
            productName: product.name
          });
        }
      });
    });

    res.json(comments.slice(0, limit));
  } catch (err) {
    console.error("User comments fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------
// GET USER'S CVS
// ------------------------------
router.get("/:userId/cvs", async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const cvs = await CV.find({ userId }).lean();
    res.json(cvs);
  } catch (err) {
    console.error("User CVs fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------
// ADD USER TO FAVORITES
// ------------------------------
router.post("/:userId/favorite", isAuth, async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  if (req.userId === userId) {
    return res.status(400).json({ message: "Cannot favorite yourself" });
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.userFavorites.includes(userId)) {
      return res.status(400).json({ message: "User already favorited" });
    }

    user.userFavorites.push(userId);
    await user.save();

    res.json({ message: "User added to favorites" });
  } catch (err) {
    console.error("Add favorite error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------
// REMOVE USER FROM FAVORITES
// ------------------------------
router.delete("/:userId/favorite", isAuth, async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const index = user.userFavorites.indexOf(userId);
    if (index === -1) {
      return res.status(400).json({ message: "User not in favorites" });
    }

    user.userFavorites.splice(index, 1);
    await user.save();

    res.json({ message: "User removed from favorites" });
  } catch (err) {
    console.error("Remove favorite error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------
// CHECK IF USER IS FAVORITED
// ------------------------------
router.get("/:userId/is-favorited", isAuth, async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isFavorited = user.userFavorites.includes(userId);
    res.json({ isFavorited });
  } catch (err) {
    console.error("Check favorite error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------
// GET CURRENT USER'S FAVORITE USERS
// ------------------------------
router.get("/favorites", isAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("userFavorites", "_id username avatar bio");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user.userFavorites);
  } catch (err) {
    console.error("Get favorites error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
