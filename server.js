import dotenv from "dotenv";
dotenv.config();

import express from "express";
const app = express();
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import SellerRoutes from "./routes/seller.js";
import CartRoutes from "./routes/CartRoutes.js";
import productRoutes from "./routes/Product.js";
import productActionsRoutes from "./routes/productActions.js";
import checkoutRoutes from "./routes/checkout.js";
import usersRoutes from "./routes/users.js";
import profileRoutes from "./routes/profile.js";
import cvRoutes from "./routes/CV.js";
import connectToDb from "./db/connectToDB.js";
import passport from "passport";
import "./strategies/google.strategy.js";
import googleAuthRoutes from "./routes/google.auth.js";

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_VERCEL_URL,
  "http://localhost:5173",
  "https://restyle-backend123.vercel.app"
];

app.use(cors({
  origin: function(origin, callback){
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) !== -1){
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed for this origin"), false);
    }
  },
  credentials: true,
  methods: ["GET","POST","PUT","DELETE","PATCH","OPTIONS"]
}));

// Handle preflight requests
app.options("*", cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET","POST","PUT","DELETE","PATCH","OPTIONS"]
}));

app.use(express.json({
  verify: (req, res, buf) => {
    if (req.originalUrl === '/api/checkout/webhook') {
      req.rawBody = buf.toString();
    }
  }
}));
app.use(cookieParser());
app.use(express.static("public"));

console.log("Frontend URL:", process.env.FRONTEND_URL);

// --- Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/product-actions", productActionsRoutes);
app.use("/admin", adminRoutes);
app.use("/seller", SellerRoutes);
app.use("/api/cart", CartRoutes);
app.use("/api/products", productRoutes);
app.use("/api/checkout", checkoutRoutes); // ✅ Only this line
app.use("/users", usersRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/cv", cvRoutes);
app.use(passport.initialize());
app.use("/api/auth", authRoutes);       
app.use("/api/auth", googleAuthRoutes);
app.get("/", (req, res) => {
  res.send(`
    <div style="background-color: white; color: black; height: 100vh; display: flex; justify-content: center; align-items: center; font-size: 30px; font-weight: bold;">
      Backend is working.
    </div>
  `);
});

const PORT = process.env.PORT || 3000;

connectToDb().then(() => {
  app.listen(PORT, () => console.log(`Server running locally on port ${PORT}`));
});
