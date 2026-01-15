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
  description: { type: String }, // optional
  isPublished: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const CV = mongoose.models.CV || mongoose.model("CV", cvSchema);
export default CV;