import express from "express";
import mongoose from "mongoose";
import isAuth from "../middlewares/isAuth.middleware.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

const router = express.Router();

// Get the authenticated user's cart
router.get("/", isAuth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.userId, status: "active" })
      .populate("products.product", "name price imageUrl");
    if (!cart) {
      return res.json({ products: [], total: 0 });
    }
    const total = cart.products.reduce((sum, item) => {
      return sum + (item.product?.price || 0) * item.quantity;
    }, 0);
    res.json({ products: cart.products, total });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch cart", error: err.message });
  }
});

// Add or update a product in the cart
router.post("/", isAuth, async (req, res) => {
  const { productId, quantity } = req.body;
  if (!productId || quantity <= 0) {
    return res.status(400).json({ message: "Invalid product or quantity" });
  }
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: "Invalid product ID format" });
  }
  try {
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    let cart = await Cart.findOne({ user: req.userId, status: "active" });
    if (!cart) {
      cart = new Cart({ user: req.userId, products: [] });
    }
    const idx = cart.products.findIndex(p => p.product.toString() === productId);
    if (idx >= 0) {
      cart.products[idx].quantity += quantity;
    } else {
      cart.products.push({ product: productId, quantity });
    }
    await cart.save();
    res.status(201).json({ message: "Product added/updated in cart", cart });
  } catch (err) {
    res.status(500).json({ message: "Failed to add/update product", error: err.message });
  }
});

// Change quantity for a product in the cart
router.patch("/:productId", isAuth, async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;
  if (!mongoose.Types.ObjectId.isValid(productId) || quantity <= 0) {
    return res.status(400).json({ message: "Invalid product or quantity" });
  }
  try {
    const cart = await Cart.findOne({ user: req.userId, status: "active" });
    if (!cart) return res.status(404).json({ message: "Cart not found" });
    const idx = cart.products.findIndex(p => p.product.toString() === productId);
    if (idx === -1) return res.status(404).json({ message: "Product not found in cart" });
    cart.products[idx].quantity = quantity;
    await cart.save();
    res.json({ message: "Product quantity updated", cart });
  } catch (err) {
    res.status(500).json({ message: "Failed to update quantity", error: err.message });
  }
});

// Remove a product from the cart
router.delete("/:productId", isAuth, async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: "Invalid product ID format" });
  }
  try {
    const cart = await Cart.findOne({ user: req.userId, status: "active" });
    if (!cart) return res.status(404).json({ message: "Cart not found" });
    cart.products = cart.products.filter(p => p.product.toString() !== productId);
    await cart.save();
    res.json({ message: "Product removed from cart", cart });
  } catch (err) {
    res.status(500).json({ message: "Failed to remove product", error: err.message });
  }
});

// Clear the cart
router.delete("/", isAuth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.userId, status: "active" });
    if (!cart) return res.status(404).json({ message: "Cart not found" });
    cart.products = [];
    await cart.save();
    res.json({ message: "Cart cleared", cart });
  } catch (err) {
    res.status(500).json({ message: "Failed to clear cart", error: err.message });
  }
});

export default router;
