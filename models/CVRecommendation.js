import mongoose from "mongoose";

const cvRecommendationSchema = new mongoose.Schema({
  cvId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "CV", 
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  createdAt: { type: Date, default: Date.now }
});

// Compound index to ensure one recommendation per user per CV
cvRecommendationSchema.index({ cvId: 1, userId: 1 }, { unique: true });

const CVRecommendation = mongoose.models.CVRecommendation || mongoose.model("CVRecommendation", cvRecommendationSchema);

export default CVRecommendation;
