import express from "express";
import isAuth from "../middlewares/isAuth.middleware.js";
import { 
  addComment, 
  deleteComment, 
  toggleRecommendation, 
  getCVWithActions 
} from "../controllers/cvActionsController.js";

const router = express.Router();

// ============================================
// GET CV WITH COMMENTS AND RECOMMENDATIONS
// GET /api/cv-actions/:cvId
// Public endpoint - no auth required
// ============================================
router.get("/:cvId", getCVWithActions);

// ============================================
// ADD COMMENT TO CV
// POST /api/cv-actions/:cvId/comment
// Requires authentication
// ============================================
router.post("/:cvId/comment", isAuth, addComment);

// ============================================
// DELETE COMMENT FROM CV
// DELETE /api/cv-actions/:cvId/comment/:commentId
// Requires authentication
// ============================================
router.delete("/:cvId/comment/:commentId", isAuth, deleteComment);

// ============================================
// TOGGLE RECOMMENDATION FOR CV
// POST /api/cv-actions/:cvId/recommend
// Requires authentication
// ============================================
router.post("/:cvId/recommend", isAuth, toggleRecommendation);

export default router;
