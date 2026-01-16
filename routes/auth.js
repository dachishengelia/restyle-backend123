import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import connectToDatabase from "../db/connectToDB.js";
import isAuth from "../middlewares/isAuth.middleware.js";
import passport from "passport";
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";


/* ===========================
   JWT COOKIE HELPER
=========================== */
function sendTokenCookie(res, user) {
  const token = jwt.sign(
    { id: user._id, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

/* ===========================
   UPDATE USERNAME
=========================== */
router.patch("/me/username", async (req, res) => {
  const { username, email, password } = req.body;
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Not authenticated" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.email !== email)
      return res.status(400).json({ message: "Incorrect email" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Incorrect password" });

    user.username = username;
    await user.save();

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ===========================
   REGISTER
=========================== */
router.post("/register", async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ message: "All fields required" });

  try {
    await connectToDatabase();

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      username,
      email,
      password: hashedPassword,
      role,
    });

    await user.save();
    sendTokenCookie(res, user);

    res.status(201).json({
      user: {
        id: user._id,
        username,
        email,
        role,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ===========================
   LOGIN
=========================== */
router.post("/log-in", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email and password required" });

  try {
    await connectToDatabase();

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    sendTokenCookie(res, user);

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ===========================
   LOGOUT
=========================== */
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });
  res.status(200).json({ message: "Logged out successfully" });
});

/* ===========================
   GOOGLE LOGIN
=========================== */
router.get(
  "/google",
  passport.authenticate("google", {
    session: false,
    scope: ["email", "profile"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  async (req, res) => {
    try {
      await connectToDatabase();

      const { email, fullName, avatar } = req.user;

      let user = await User.findOne({ email });

      if (!user) {
        user = await User.create({
          username: fullName,
          email,
          avatar,
          role: "buyer",
          authProvider: "google",
        });
      }

      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.redirect(
        `${process.env.FRONTEND_URL}/auth-success?token=${token}`
      );
    } catch (err) {
      console.error("Google auth error:", err);
      res.redirect(`${process.env.FRONTEND_URL}/login`);
    }
  }
);



/* ===========================
   GET CURRENT USER
=========================== */
router.get("/me", async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Not authenticated" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(
      decoded.id,
      "username email role avatar"
    ).lean();

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user });
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
});

/* ===========================
   UPDATE PROFILE (USERNAME, PASSWORD, AVATAR)
=========================== */
router.patch("/profile", isAuth, async (req, res) => {
  const { username, currentPassword, newPassword, avatar } = req.body;

  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (username) user.username = username;
    if (avatar) user.avatar = avatar; // 🔥 FIX

    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch)
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

export default router;
