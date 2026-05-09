import dotenv from "dotenv";
dotenv.config();

import express from "express";
const app = express();
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import passport from "./strategies/google.strategy.js";
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
import cvActionsRoutes from "./routes/cvActions.js";
import statsRoutes from "./routes/stats.js";
import reviewsRoutes from "./routes/reviews.js";
import favoritesRoutes from "./routes/favorites.js";
import messagesRoutes from "./routes/messages.js";
import connectToDb from "./db/connectToDB.js";

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
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(express.static("public"));
app.use(passport.initialize());

console.log("Frontend URL:", process.env.FRONTEND_URL);

// --- Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/product-actions", productActionsRoutes);
app.use("/admin", adminRoutes);
app.use("/seller", SellerRoutes);
app.use("/api/cart", CartRoutes);
app.use("/api/products", productRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/cv", cvRoutes);
app.use("/api/cv-actions", cvActionsRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/messages", messagesRoutes);

app.get("/", (req, res) => {
  res.send(`
    <div style="background-color: white; color: black; height: 100vh; display: flex; justify-content: center; align-items: center; font-size: 30px; font-weight: bold;">
      Backend is working.
    </div>
  `);
});

// Global error handler - ensure all errors return JSON
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  
  // Check if response is already sent
  if (res.headersSent) {
    return next(err);
  }
  
  // Return JSON error response
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Connect to database
connectToDb().then(() => {
  console.log('MongoDB connected');
});

// Start server locally only (not on Vercel serverless)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  const startServer = (port) => {
    const server = app.listen(port, () => {
      console.log(`Server running locally on port ${port}`);
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE' && port < 3010) {
        console.log(`Port ${port} in use, trying ${port + 1}...`);
        startServer(port + 1);
      } else {
        console.error('Server error:', err);
      }
    });
    
    return server;
  };
  startServer(PORT);
} else {
  console.log('Running on Vercel serverless');
}

// Export Express app for Vercel serverless functions
export default app;