import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "../strategies/google.strategy.js";
import authRoutes from "../routes/auth.js";
import adminRoutes from "../routes/admin.js";
import SellerRoutes from "../routes/seller.js";
import CartRoutes from "../routes/CartRoutes.js";
import productRoutes from "../routes/Product.js";
import productActionsRoutes from "../routes/productActions.js";
import checkoutRoutes from "../routes/checkout.js";
import usersRoutes from "../routes/users.js";
import profileRoutes from "../routes/profile.js";
import cvRoutes from "../routes/CV.js";
import cvActionsRoutes from "../routes/cvActions.js";
import statsRoutes from "../routes/stats.js";
import reviewsRoutes from "../routes/reviews.js";
import favoritesRoutes from "../routes/favorites.js";
import messagesRoutes from "../routes/messages.js";
import connectToDb from "../db/connectToDB.js";
import dotenv from "dotenv";

dotenv.config();

let app;

function createApp() {
  const expressApp = express();

  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_VERCEL_URL,
    "http://localhost:5173",
    "https://restyle-backend123.vercel.app"
  ];

  expressApp.use(cors({
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

  expressApp.options("*", cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET","POST","PUT","DELETE","PATCH","OPTIONS"]
  }));

  expressApp.use(express.json({
    verify: (req, res, buf) => {
      if (req.originalUrl === '/api/checkout/webhook') {
        req.rawBody = buf.toString();
      }
    }
  }));
  expressApp.use(express.urlencoded({ extended: true, limit: '10mb' }));
  expressApp.use(cookieParser());
  expressApp.use(express.static("public"));
  expressApp.use(passport.initialize());

  expressApp.use("/api/auth", authRoutes);
  expressApp.use("/api/product-actions", productActionsRoutes);
  expressApp.use("/admin", adminRoutes);
  expressApp.use("/seller", SellerRoutes);
  expressApp.use("/api/cart", CartRoutes);
  expressApp.use("/api/products", productRoutes);
  expressApp.use("/api/checkout", checkoutRoutes);
  expressApp.use("/api/users", usersRoutes);
  expressApp.use("/api/profile", profileRoutes);
  expressApp.use("/api/cv", cvRoutes);
  expressApp.use("/api/cv-actions", cvActionsRoutes);
  expressApp.use("/api/stats", statsRoutes);
  expressApp.use("/api/reviews", reviewsRoutes);
  expressApp.use("/api/favorites", favoritesRoutes);
  expressApp.use("/api/messages", messagesRoutes);

  expressApp.get("/", (req, res) => {
    res.send(`
      <div style="background-color: white; color: black; height: 100vh; display: flex; justify-content: center; align-items: center; font-size: 30px; font-weight: bold;">
        Backend is working.
      </div>
    `);
  });

  expressApp.use((err, req, res, next) => {
    console.error("Global error handler:", err);
    if (res.headersSent) return next(err);
    res.status(err.status || 500).json({
      message: err.message || "Internal Server Error",
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  return expressApp;
}

// Create and export the app
app = createApp();

// Connect to database
connectToDb().catch(console.error);

// Export the Express app as default for Vercel serverless
export default app;