import mongoose from "mongoose";
import CV from "../models/CV.js";
import CVComment from "../models/CVComment.js";
import CVRecommendation from "../models/CVRecommendation.js";

// Helper to validate ObjectId
const isValidObjectId = (id) => mongoose.isValidObjectId(id);

// ============================================
// ADD COMMENT TO CV
// POST /api/cv-actions/:cvId/comment
// ============================================
export const addComment = async (req, res) => {
  const { cvId } = req.params;
  const { text } = req.body;

  // Validate CV ID
  if (!isValidObjectId(cvId)) {
    return res.status(400).json({ message: "Invalid CV ID format" });
  }

  // Validation
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ message: "Comment text is required" });
  }

  if (text.trim().length > 500) {
    return res.status(400).json({ message: "Comment must be 500 characters or less" });
  }

  try {
    console.log("=== addComment called with cvId:", cvId, "userId:", req.userId);
    console.log("=== text:", text);

    // Check if CV exists
    const cv = await CV.findById(cvId);
    if (!cv) {
      console.log("=== CV not found:", cvId);
      return res.status(404).json({ message: "CV not found" });
    }
    console.log("=== CV found:", cv._id);

    // Get user info for storing in comment
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(req.userId);
    console.log("=== User found:", user?._id, "username:", user?.username);

    // Create comment with user data stored directly (denormalized)
    const comment = new CVComment({
      cvId,
      userId: req.userId,
      username: user?.username || "Unknown",
      avatar: user?.avatar || "/default-avatar.png",
      text: text.trim()
    });
    console.log("=== Comment object created:", comment);

    await comment.save();
    console.log("=== Comment saved successfully, _id:", comment._id);

    res.status(201).json({
      message: "Comment added successfully",
      comment
    });
  } catch (err) {
    console.error("=== Error adding comment:", err);
    res.status(500).json({
      message: "Failed to add comment",
      error: err.message
    });
  }
};

// ============================================
// DELETE COMMENT FROM CV
// DELETE /api/cv-actions/:cvId/comment/:commentId
// ============================================
export const deleteComment = async (req, res) => {
  const { cvId, commentId } = req.params;

  // Validate IDs
  if (!isValidObjectId(cvId) || !isValidObjectId(commentId)) {
    return res.status(400).json({ message: "Invalid ID format" });
  }

  try {
    // Find comment
    const comment = await CVComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if comment belongs to the specified CV
    if (comment.cvId.toString() !== cvId) {
      return res.status(400).json({ message: "Comment does not belong to this CV" });
    }

    // Check if user owns the comment or is admin
    if (comment.userId.toString() !== req.userId && req.role !== "admin") {
      return res.status(403).json({ 
        message: "Access denied: You can only delete your own comments" 
      });
    }

    await CVComment.findByIdAndDelete(commentId);

    res.status(200).json({
      message: "Comment deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting comment:", err);
    res.status(500).json({
      message: "Failed to delete comment",
      error: err.message
    });
  }
};

// ============================================
// TOGGLE RECOMMENDATION FOR CV
// POST /api/cv-actions/:cvId/recommend
// ============================================
export const toggleRecommendation = async (req, res) => {
  const { cvId } = req.params;

  // Validate CV ID
  if (!isValidObjectId(cvId)) {
    return res.status(400).json({ message: "Invalid CV ID format" });
  }

  try {
    // Check if CV exists
    const cv = await CV.findById(cvId);
    if (!cv) {
      return res.status(404).json({ message: "CV not found" });
    }

    // Check if user already recommended
    const existingRecommendation = await CVRecommendation.findOne({
      cvId,
      userId: req.userId
    });

    let isRecommended = false;

    if (existingRecommendation) {
      // Remove recommendation (toggle off)
      await CVRecommendation.findByIdAndDelete(existingRecommendation._id);
      isRecommended = false;
    } else {
      try {
        // Add recommendation (toggle on)
        const recommendation = new CVRecommendation({
          cvId,
          userId: req.userId
        });
        await recommendation.save();
        isRecommended = true;
      } catch (err) {
        // Handle duplicate key error (race condition)
        if (err.code === 11000) {
          // Already recommended, just remove it
          await CVRecommendation.findOneAndDelete({ cvId, userId: req.userId });
          isRecommended = false;
        } else {
          throw err;
        }
      }
    }

    // Get updated recommendation count
    const recommendationCount = await CVRecommendation.countDocuments({ cvId });

    res.status(200).json({
      message: isRecommended ? "CV recommended successfully" : "Recommendation removed",
      isRecommended,
      recommendationCount
    });
  } catch (err) {
    console.error("Error toggling recommendation:", err);
    res.status(500).json({
      message: "Failed to toggle recommendation",
      error: err.message
    });
  }
};

// ============================================
// GET CV WITH COMMENTS AND RECOMMENDATIONS
// GET /api/cv-actions/:cvId
// ============================================
export const getCVWithActions = async (req, res) => {
  const { cvId } = req.params;

  // Validate CV ID
  if (!isValidObjectId(cvId)) {
    return res.status(400).json({ message: "Invalid CV ID format" });
  }

  try {
    console.log("=== getCVWithActions called with cvId:", cvId);

    // Get CV
    const cv = await CV.findById(cvId).populate("userId", "username email avatar");
    if (!cv) {
      console.log("=== CV not found:", cvId);
      return res.status(404).json({ message: "CV not found" });
    }
    console.log("=== CV found:", cv._id);

    // Get comments - stored directly with user data, no populate needed
    const comments = await CVComment.find({ cvId })
      .select("userId username avatar text createdAt")
      .sort({ createdAt: -1 });
    console.log("=== Comments found:", comments.length);

    // Get recommendations count
    const recommendationCount = await CVRecommendation.countDocuments({ cvId });

    // Check if current user has recommended (if authenticated)
    let isRecommended = false;
    if (req.userId) {
      const userRecommendation = await CVRecommendation.findOne({
        cvId,
        userId: req.userId
      });
      isRecommended = !!userRecommendation;
    }

    res.status(200).json({
      message: "CV retrieved successfully",
      cv,
      comments,
      recommendationCount,
      isRecommended,
      totalComments: comments.length
    });
  } catch (err) {
    console.error("Error getting CV with actions:", err);
    res.status(500).json({
      message: "Failed to retrieve CV",
      error: err.message
    });
  }
};
