import express from "express";
import mongoose from "mongoose";
import { v2 as cloudinary } from 'cloudinary';
import Product from "../models/Product.js";
import User from "../models/User.js";
import isAuth, { isSeller, isAdmin } from "../middlewares/isAuth.middleware.js";
import { upload, uploadMultiple, uploadToCloudinary, cleanupTempFile } from "../config/cloudinary.config.js";
import { sendEmail } from "../utils/sendEmail.js";

const router = express.Router();

/* =======================
     GET ALL PRODUCTS
======================= */
router.get("/", async (req, res) => {
  try {
    console.log("GET /api/products called with query params:", req.query);

    // Parse query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const search = req.query.search;
    const category = req.query.category;
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : undefined;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined;
    const sortParam = req.query.sort;
    const order = req.query.order || 'desc';

    // Build filter object
    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    if (category) {
      filter.mainCategory = { $regex: `^${category}$`, $options: 'i' };
    }

    if (minPrice !== undefined) {
      filter.price = { ...filter.price, $gte: minPrice };
    }

    if (maxPrice !== undefined) {
      filter.price = { ...filter.price, $lte: maxPrice };
    }

    console.log("Built filter:", JSON.stringify(filter, null, 2));

    // Build sort object
    let sort = { createdAt: -1 }; // default newest first

    if (sortParam === 'price') {
      sort = { price: order === 'asc' ? 1 : -1 };
    } else if (sortParam === 'newest') {
      sort = { createdAt: order === 'asc' ? 1 : -1 };
    }

    // Pagination
    const skip = (page - 1) * limit;
    const products = await Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('sellerId', 'username');

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    res.json({
      products,
      totalPages,
      currentPage: page,
      totalProducts
    });
  } catch (err) {
    console.error("Error fetching products:", err);
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
    
    // Ensure imageUrl is explicitly included for backward compatibility
    const productObj = product.toObject();
    if (product.images && product.images.length > 0) {
      productObj.imageUrl = product.images[0];
    } else {
      productObj.imageUrl = null;
    }
    
    res.json(productObj);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* =======================
    ADD NEW PRODUCT
======================= */
router.post("/", isAuth, isSeller, uploadMultiple, async (req, res) => {
  try {
    const { name, price, description, mainCategory, subcategory, discount, secondhand, sizes, colors } = req.body;
    
    if (!name || !price || !description || !mainCategory || !subcategory) {
      return res
        .status(400)
        .json({ message: "Name, price, description, mainCategory, and subcategory are required" });
    }

    let productImages = [];
    
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const url = await uploadToCloudinary(file);
          productImages.push(url);
          cleanupTempFile(file.path);
        } catch (uploadError) {
          console.error('Error uploading file:', file.originalname, uploadError);
          cleanupTempFile(file.path);
        }
      }
    } else if (req.body.images) {
      try {
        const parsedImages = typeof req.body.images === 'string' ? JSON.parse(req.body.images) : req.body.images;
        if (Array.isArray(parsedImages)) {
          productImages = parsedImages;
        }
      } catch (e) {
        productImages = [req.body.images];
      }
    }

    if (productImages.length === 0) {
      return res.status(400).json({ message: "At least one image is required" });
    }

    const product = new Product({
      name,
      price,
      description,
      mainCategory,
      subcategory,
      discount: discount || 0,
      secondhand: secondhand || false,
      sellerId: req.userId,
      images: productImages,
      sizes: sizes ? (Array.isArray(sizes) ? sizes : JSON.parse(sizes)) : [],
      colors: colors ? (Array.isArray(colors) ? colors : JSON.parse(colors)) : [],
    });
    await product.save();

    res.status(201).json({ message: "Product added successfully", product });
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(500).json({ message: "Failed to add product" });
  }
});

/* =======================
   UPLOAD PRODUCT IMAGE
======================= */
router.post("/upload", isAuth, uploadMultiple, async (req, res) => {
  console.log("Upload endpoint called");
  console.log("Files received:", req.files ? req.files.length : 0);
  console.log("Body keys:", Object.keys(req.body));
  
  try {
    // Check if files were uploaded via multipart form data
    if (!req.files || req.files.length === 0) {
      // Check if images were sent as base64 in JSON body
      if (req.body.images) {
        console.log("Received images in body as base64/JSON");
        try {
          let images = req.body.images;
          if (typeof images === 'string') {
            images = JSON.parse(images);
          }
          
          if (Array.isArray(images) && images.length > 0) {
            const imageUrls = [];
            for (const img of images) {
              try {
                // Handle both base64 and URL formats
                const imgData = img.url || img;
                const result = await cloudinary.uploader.upload(imgData, { folder: 'restyle-products' });
                imageUrls.push(result.secure_url);
                console.log("Base64 image uploaded:", result.secure_url);
              } catch (uploadError) {
                console.error('Error uploading base64 image:', uploadError.message);
              }
            }
            if (imageUrls.length > 0) {
              return res.status(200).json({ message: "Images uploaded successfully", imageUrls });
            }
          }
        } catch (parseError) {
          console.error('Error parsing images:', parseError.message);
        }
      }
      return res.status(400).json({ message: "No files uploaded" });
    }
    
    const imageUrls = [];
    for (const file of req.files) {
      console.log("Processing file:", file.originalname, "Size:", file.size, "Path:", file.path);
      
      if (!file.path && !file.buffer) {
        console.error("File has no path or buffer:", file.originalname);
        continue;
      }
      
      try {
        const url = await uploadToCloudinary(file);
        console.log("Uploaded successfully:", url);
        imageUrls.push(url);
        cleanupTempFile(file.path);
      } catch (uploadError) {
        console.error('Error uploading file:', file.originalname, uploadError.message);
        if (file.path) cleanupTempFile(file.path);
      }
    }
    
    if (imageUrls.length === 0) {
      return res.status(500).json({ message: "Failed to upload any images" });
    }
    
    res.status(200).json({ message: "Images uploaded successfully", imageUrls });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Failed to upload images", error: err.message, stack: process.env.NODE_ENV === 'development' ? err.stack : undefined });
  }
});

/* =======================
     UPDATE PRODUCT IMAGE
 ======================= */
router.patch("/:id/image", isAuth, isSeller, uploadMultiple, async (req, res) => {
  try {
    const { images } = req.body;
    let updateImages = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const url = await uploadToCloudinary(file);
          updateImages.push(url);
          cleanupTempFile(file.path);
        } catch (uploadError) {
          console.error('Error uploading file:', file.originalname, uploadError);
          cleanupTempFile(file.path);
        }
      }
    } else if (images) {
      try {
        const parsedImages = typeof images === 'string' ? JSON.parse(images) : images;
        if (Array.isArray(parsedImages)) {
          updateImages = parsedImages;
        }
      } catch (e) {
        updateImages = [images];
      }
    }

    if (updateImages.length === 0) {
      return res.status(400).json({ message: "Images or files required" });
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, sellerId: req.userId },
      { images: updateImages },
      { new: true }
    );
    if (!product)
      return res.status(404).json({ message: "Product not found or unauthorized" });

    res.json({ message: "Product image updated successfully", product });
  } catch (err) {
    console.error("Error updating image:", err);
    res.status(500).json({ message: "Failed to update product image" });
  }
});

/* =======================
     UPDATE PRODUCT DETAILS
======================= */
router.patch("/:id", isAuth, isSeller, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid product ID format" });
  }

  const { name, price, description, mainCategory, subcategory, discount, secondhand, imageUrl, images, sizes, colors } = req.body;

  if (name !== undefined && !name.trim()) {
    return res.status(400).json({ message: "Name cannot be empty" });
  }
  if (price !== undefined && (isNaN(price) || price < 0)) {
    return res.status(400).json({ message: "Price must be a positive number" });
  }
  if (description !== undefined && !description.trim()) {
    return res.status(400).json({ message: "Description cannot be empty" });
  }
  if (mainCategory !== undefined && !mainCategory.trim()) {
    return res.status(400).json({ message: "Main category cannot be empty" });
  }
  if (subcategory !== undefined && !subcategory.trim()) {
    return res.status(400).json({ message: "Subcategory cannot be empty" });
  }
  if (images !== undefined && (!Array.isArray(images) || images.length === 0)) {
    return res.status(400).json({ message: "Images must be a non-empty array" });
  }
  if (imageUrl !== undefined && typeof imageUrl !== 'string') {
    return res.status(400).json({ message: "Image URL must be a string" });
  }

  try {
    const updateFields = {};
    if (name !== undefined) updateFields.name = name.trim();
    if (price !== undefined) updateFields.price = price;
    if (description !== undefined) updateFields.description = description.trim();
    if (mainCategory !== undefined) updateFields.mainCategory = mainCategory.trim().toLowerCase();
    if (subcategory !== undefined) updateFields.subcategory = subcategory.trim();
    if (discount !== undefined) updateFields.discount = discount;
    if (secondhand !== undefined) updateFields.secondhand = secondhand;
    if (images !== undefined) {
      updateFields.images = images;
    } else if (imageUrl !== undefined) {
      updateFields.images = [imageUrl.trim()];
    }
    if (sizes !== undefined) updateFields.sizes = Array.isArray(sizes) ? sizes : [];
    if (colors !== undefined) updateFields.colors = Array.isArray(colors) ? colors : [];

    const product = await Product.findOneAndUpdate(
      { _id: id, sellerId: req.userId },
      updateFields,
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found or unauthorized" });
    }

    res.json({ message: "Product updated successfully", product });
  } catch (err) {
    res.status(500).json({ message: "Failed to update product" });
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
    GET LIKES
======================= */
router.get("/:id/likes", isAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const userId = req.userId;
    const liked = product.likes.includes(userId);
    const disliked = product.dislikes.includes(userId);

    res.json({
      likesCount: product.likes.length,
      dislikesCount: product.dislikes.length,
      liked,
      disliked
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
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
