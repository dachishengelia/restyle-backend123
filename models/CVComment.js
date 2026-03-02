import mongoose from "mongoose";

const cvCommentSchema = new mongoose.Schema({
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
  username: { 
    type: String, 
    required: true 
  },
  avatar: { 
    type: String, 
    default: "/default-avatar.png" 
  },
  text: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 500
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update updatedAt on save
cvCommentSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

const CVComment = mongoose.models.CVComment || mongoose.model("CVComment", cvCommentSchema);

export default CVComment;
