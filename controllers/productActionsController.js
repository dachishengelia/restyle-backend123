import Product from "../models/Product.js";
import User from "../models/User.js";
import mongoose from "mongoose";

// Toggle like
export const toggleLike = async (req, res) => {
  try {
    const userId = req.user._id;
    const productId = req.params.id;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const alreadyLiked = product.likes.some((id) => id.equals(userId));
    if (alreadyLiked) {
      product.likes = product.likes.filter((id) => !id.equals(userId));
    } else {
      product.likes.push(userId);
    }

    await product.save();

    return res.json({
      success: true,
      likesCount: product.likes.length,
      liked: !alreadyLiked,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Add comment
export const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Comment text required" });

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const comment = {
      userId: req.user._id,
      username: req.user.username,
      text: text.trim(),
    };

    product.comments.push(comment);
    await product.save();

    return res.json({
      success: true,
      comments: product.comments,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete comment
export const deleteComment = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const comment = product.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (!comment.userId.equals(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to delete this comment" });
    }

    comment.remove();
    await product.save();

    return res.json({ success: true, comments: product.comments });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Toggle favorite
export const toggleFavorite = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const productId = req.params.id;
    const already = user.favorites?.some((id) => id.equals(productId));

    if (already) {
      user.favorites = user.favorites.filter((id) => !id.equals(productId));
    } else {
      if (!user.favorites) user.favorites = [];
      user.favorites.push(productId);
    }

    await user.save();

    return res.json({ success: true, favorited: !already, favorites: user.favorites });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get all favorite products of logged-in user
export const getUserFavorites = async (req, res) => {
  try {
    console.log("Fetching favorites for user:", req.user._id); // Debugging log
    const user = await User.findById(req.user._id).populate("favorites");
    if (!user) {
      console.error("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ favorites: user.favorites });
  } catch (err) {
    console.error("Error fetching user favorites:", err); // Debugging log
    res.status(500).json({ message: "Failed to fetch favorites" });
  }
};
