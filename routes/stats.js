import express from "express";
import User from "../models/User.js";
import Product from "../models/Product.js";
import CV from "../models/CV.js";

const router = express.Router();

/* ===========================
    GET TOTAL USERS COUNT
=========================== */
router.get("/users", async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ count });
  } catch (err) {
    console.error("Error fetching user count:", err);
    res.status(500).json({ message: "Failed to fetch user count" });
  }
});

/* ===========================
    GET TOTAL PRODUCTS COUNT
=========================== */
router.get("/products", async (req, res) => {
  try {
    const count = await Product.countDocuments();
    res.json({ count });
  } catch (err) {
    console.error("Error fetching product count:", err);
    res.status(500).json({ message: "Failed to fetch product count" });
  }
});

/* ===========================
    GET TOTAL CVS COUNT
=========================== */
router.get("/cvs", async (req, res) => {
  try {
    const count = await CV.countDocuments();
    res.json({ count });
  } catch (err) {
    console.error("Error fetching CV count:", err);
    res.status(500).json({ message: "Failed to fetch CV count" });
  }
});

export default router;