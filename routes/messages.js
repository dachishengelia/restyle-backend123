import express from "express";
import Message from "../models/Message.js";
import User from "../models/User.js";
import isAuth from "../middlewares/isAuth.middleware.js";

const router = express.Router();

// GET /api/messages/:userId - Fetch messages between authenticated user and specified userId
router.get("/:userId", isAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const authUserId = req.userId;

    // Validate userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Fetch messages where auth user is sender or recipient, and the other is userId
    const messages = await Message.find({
      $or: [
        { senderId: authUserId, recipientId: userId },
        { senderId: userId, recipientId: authUserId }
      ]
    })
    .sort({ createdAt: 1 }); // Oldest first
    
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/messages - Send a new message
router.post("/", isAuth, async (req, res) => {
  try {
    const { recipientId, content } = req.body;
    const senderId = req.userId;

    // Validate required fields
    if (!recipientId || !content) {
      return res.status(400).json({ message: "recipientId and content are required" });
    }

    // Validate recipientId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ message: "Invalid recipient ID" });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    // Prevent sending message to self
    if (recipientId === senderId) {
      return res.status(400).json({ message: "Cannot send message to yourself" });
    }

    // Create and save the message
    const message = new Message({
      senderId,
      recipientId,
      content
    });

    const savedMessage = await message.save();

    // Populate the saved message for response
    await savedMessage.populate('senderId', 'username email');
    await savedMessage.populate('recipientId', 'username email');

    res.status(201).json(savedMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;