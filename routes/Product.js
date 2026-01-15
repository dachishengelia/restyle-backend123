import express from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import User from "../models/User.js";
import isAuth, { isSeller, isAdmin } from "../middlewares/isAuth.middleware.js";
import { upload } from "../config/cloudinary.config.js";
import { sendEmail } from "../utils/sendEmail.js";

const router = express.Router();

/* =======================
   GET ALL PRODUCTS
======================= */
router.get("/", async (req, res) => {
  try {
    let query = {};

    if (req.query.size) {
      query.sizes = { $in: [req.query.size] };
    }

    if (req.query.color) {
      query.colors = { $in: [req.query.color] };
    }

    const products = await Product.find(query)
      .populate("sellerId", "username email")
      .lean();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

/* =======================
   GET PRODUCTS FOR SELLER
======================= */
router.get("/seller", isAuth, isSeller, async (req, res) => {
  try {
    const sellerId = req.userId || req.user?._id?.toString();
    if (!sellerId || !mongoose.Types.ObjectId.isValid(sellerId)) {
      return res.status(400).json({ message: "Invalid seller ID format" });
    }
    const products = await Product.find({ sellerId }).lean();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* =======================
   GET PRODUCT BY ID
======================= */
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid product ID format" });
  }

  try {
    const product = await Product.findById(id).populate(
      "sellerId",
      "username email"
    );
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* =======================
   ADD NEW PRODUCT
======================= */
router.post("/", isAuth, isSeller, async (req, res) => {
  const { name, price, description, category, imageUrl, sizes, colors } = req.body;
  if (!name || !price || !description) {
    return res
      .status(400)
      .json({ message: "Name, price, and description are required" });
  }

  try {
    const product = new Product({
      name,
      price,
      description,
      category,
      sellerId: req.userId,
      imageUrl: imageUrl || "null",
      sizes: sizes || [],
      colors: colors || [],
    });
    await product.save();

    // Send confirmation email to seller
    // const seller = await User.findById(req.userId);
    // if (seller && seller.email) {
    //   await sendEmail({
    //     to: seller.email,
    //     subject: "Your product has been listed successfully!",
    //     html: `
    //       <h2>Product Listed!</h2>
    //       <p>Your product <strong>${product.name}</strong> has been successfully added to Restyle.</p>
    //       <p>Price: $${product.price}</p>
    //       <p>Start selling now!</p>
    //     `,
    //   });
    // }

    res.status(201).json({ message: "Product added successfully", product });
  } catch (err) {
    res.status(500).json({ message: "Failed to add product" });
  }
});

/* =======================
   UPLOAD PRODUCT IMAGE
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
   UPDATE PRODUCT IMAGE
======================= */
router.patch("/:id/image", isAuth, isSeller, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ message: "Image URL required" });

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, sellerId: req.userId },
      { imageUrl },
      { new: true }
    );
    if (!product)
      return res.status(404).json({ message: "Product not found or unauthorized" });

    res.json({ message: "Product image updated successfully", product });
  } catch (err) {
    res.status(500).json({ message: "Failed to update product image" });
  }
});

/* =======================
   DELETE PRODUCT (SELLER)
======================= */
router.delete("/:id", isAuth, isSeller, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      sellerId: req.userId,
    });
    if (!product)
      return res.status(404).json({ message: "Product not found or unauthorized" });

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete product" });
  }
});

/* =======================
   DELETE PRODUCT (ADMIN)
======================= */
router.delete("/admin/:id", isAuth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    await Product.findByIdAndDelete(id);
    res.json({ message: "Product deleted successfully by admin" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete product" });
  }
});

/* =======================
   TOGGLE LIKE
======================= */
router.post("/:id/like", isAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const userId = req.userId;
    const index = product.likes.indexOf(userId);

    if (index === -1) product.likes.push(userId);
    else product.likes.splice(index, 1);

    await product.save();
    res.json({ likes: product.likes.length, liked: index === -1 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =======================
   TOGGLE DISLIKE
======================= */
router.post("/:id/dislike", isAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const userId = req.userId;
    const index = product.dislikes.indexOf(userId);

    if (index === -1) product.dislikes.push(userId);
    else product.dislikes.splice(index, 1);

    await product.save();
    res.json({ dislikes: product.dislikes.length, disliked: index === -1 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =======================
   ADD COMMENT
======================= */
router.post("/:id/comment", isAuth, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ message: "Comment text required" });

  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const { default: User } = await import("../models/User.js");
    const user = await User.findById(req.userId);

    product.comments.push({
      userId: req.userId,
      username: user?.username || "Unknown",
      text,
      createdAt: new Date(),
    });

    await product.save();
    res.json({ comments: product.comments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
