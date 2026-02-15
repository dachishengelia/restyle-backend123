import express from "express";
import isAuth from "../middlewares/isAuth.middleware.js";
import { addCV, checkoutCV, getMarketplace, getMyCV, getUserCVs, publishCV } from "../controllers/cvController.js";
import { upload } from "../config/cloudinary.config.js";

const router = express.Router();

/* =======================
    ADD CV
======================= */
router.post("/", isAuth, addCV);

/* =======================
    UPLOAD CV PROFILE IMAGE
======================= */
router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const imageUrl = req.file.path; // Cloudinary URL
    res.status(200).json({ message: "Image uploaded successfully", imageUrl });
  } catch (err) {
    res.status(500).json({ message: "Failed to upload image" });
  }
});

/* =======================
    CHECKOUT CV
======================= */
router.post("/checkout", isAuth, checkoutCV);

/* =======================
    GET MARKETPLACE CVS
======================= */
router.get("/marketplace", getMarketplace);

/* =======================
     GET MY CV
======================= */
router.get("/my-cv", isAuth, getMyCV);

/* =======================
     GET USER CVS
======================= */
router.get("/user", isAuth, getUserCVs);

/* =======================
     PUBLISH CV
======================= */
router.put("/publish/:cvId", isAuth, publishCV);

/* =======================
    TEST PUBLISH CV (DEBUG ONLY - REMOVE IN PRODUCTION)
======================= */
router.post("/test-publish/:cvId", async (req, res) => {
  try {
    const cv = await CV.findById(req.params.cvId);
    if (!cv) {
      return res.status(404).json({ message: "CV not found" });
    }
    cv.isPublished = true;
    await cv.save();
    res.status(200).json({ message: "CV published for testing", cv });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

/* =======================
    DEBUG: LIST ALL CVS (REMOVE IN PRODUCTION)
======================= */
router.get("/debug/all", async (req, res) => {
  try {
    const cvs = await CV.find({}).populate("userId", "username email");
    res.status(200).json({ message: "All CVs", cvs });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

export default router;