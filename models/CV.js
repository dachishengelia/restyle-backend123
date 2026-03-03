import mongoose from "mongoose";

const cvSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  height: { type: Number, required: true }, // in cm
  weight: { type: Number, required: true }, // in kg
  nationality: { type: String, required: true },
  languages: [{ type: String, required: true }],
  instagram: { type: String }, // optional
  email: { type: String, required: true },
  profileImage: { type: String, required: true }, // Cloudinary URL
  imageUrls: [{ type: String }], // Array of multiple image URLs
  description: { type: String }, // optional
  isPublished: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Virtual for backward compatibility: return the profile image URL
cvSchema.virtual('imageUrl').get(function() {
  if (this.imageUrls && this.imageUrls.length > 0) {
    return this.imageUrls[0];
  }
  return this.profileImage || null;
});

// Ensure virtual fields are serialized
cvSchema.set('toJSON', { virtuals: true });

const CV = mongoose.models.CV || mongoose.model("CV", cvSchema);
export default CV;