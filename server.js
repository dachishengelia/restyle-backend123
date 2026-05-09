import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
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

let app;

try {
  app = express();

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

  app.use((err, req, res, next) => {
    console.error("Global error handler:", err);
    if (res.headersSent) return next(err);
    res.status(err.status || 500).json({
      message: err.message || "Internal Server Error",
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });
} catch (err) {
  console.error("Error initializing app:", err);
  app = express();
  app.use((req, res) => res.status(500).json({ error: "App initialization failed" }));
}

connectToDb().catch(console.error);

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running locally on port ${PORT}`));
}

export { app };
export default app;