import CV from "../models/CV.js";
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const addCV = async (req, res) => {
  const { height, weight, nationality, languages, instagram, email, profileImage, description } = req.body;

  // Validation
  if (!height || !weight || !nationality || !languages || !email) {
    return res.status(400).json({
      message: "Height, weight, nationality, languages, and email are required"
    });
  }

  if (!Array.isArray(languages) || languages.length === 0) {
    return res.status(400).json({
      message: "Languages must be a non-empty array"
    });
  }

  try {
    // Check if user already has a CV (optional)
    const existingCV = await CV.findOne({ userId: req.userId });
    if (existingCV) {
      return res.status(400).json({
        message: "User already has a CV. Only one CV per user is allowed."
      });
    }

    const cv = new CV({
      userId: req.userId,
      height: parseFloat(height),
      weight: parseFloat(weight),
      nationality,
      languages,
      instagram: instagram || null,
      email,
      profileImage: profileImage || null,
      description: description || null,
    });

    await cv.save();

    res.status(201).json({
      message: "CV added successfully",
      cv
    });
  } catch (err) {
    console.error("Error adding CV:", err);
    res.status(500).json({
      message: "Failed to add CV",
      error: err.message
    });
  }
};

export const checkoutCV = async (req, res) => {
  const { height, weight, nationality, languages, instagram, email, profileImage, description } = req.body;

  // Validation
  if (!height || !weight || !nationality || !languages || !email || !profileImage) {
    return res.status(400).json({
      message: "Height, weight, nationality, languages, email, and profileImage are required"
    });
  }

  if (!Array.isArray(languages) || languages.length === 0) {
    return res.status(400).json({
      message: "Languages must be a non-empty array"
    });
  }

  try {
    // Check if user already has a CV
    let cv = await CV.findOne({ userId: req.userId });
    if (cv) {
      // Update existing CV
      cv.height = parseFloat(height);
      cv.weight = parseFloat(weight);
      cv.nationality = nationality;
      cv.languages = languages;
      cv.instagram = instagram || null;
      cv.email = email;
      cv.profileImage = profileImage;
      cv.description = description || null;
      cv.isPublished = false; // Reset to unpublished to allow republishing
    } else {
      // Create new CV
      cv = new CV({
        userId: req.userId,
        height: parseFloat(height),
        weight: parseFloat(weight),
        nationality,
        languages,
        instagram: instagram || null,
        email,
        profileImage,
        description: description || null,
        isPublished: false,
      });
    }

    await cv.save();

    // Publish the CV directly since uploading is now free
    cv.isPublished = true;
    await cv.save();

    res.status(200).json({
      message: "CV submitted and published successfully",
      cv
    });

    // Commented out Stripe checkout session for CV
    /*
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "CV Submission",
              description: "Submit your CV to the marketplace",
            },
            unit_amount: 499, // $4.99 in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/success`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      metadata: {
        type: "cv",
        cvId: cv._id.toString(),
      },
    });

    res.json({ url: session.url });
    */
  } catch (err) {
    console.error("Error creating CV checkout:", err);
    res.status(500).json({
      message: "Failed to create checkout session",
      error: err.message
    });
  }
};

export const getMarketplace = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const cvs = await CV.find({ isPublished: true })
      .populate("userId", "username email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await CV.countDocuments({ isPublished: true });
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      message: "Marketplace CVs retrieved successfully",
      cvs,
      total,
      page,
      totalPages
    });
  } catch (err) {
    console.error("Error retrieving marketplace CVs:", err);
    res.status(500).json({
      message: "Failed to retrieve marketplace CVs",
      error: err.message
    });
  }
};

export const getMyCV = async (req, res) => {
  try {
    const cv = await CV.findOne({ userId: req.userId });
    if (!cv) {
      return res.status(404).json({
        message: "CV not found"
      });
    }
    res.status(200).json({
      message: "CV retrieved successfully",
      cv
    });
  } catch (err) {
    console.error("Error retrieving CV:", err);
    res.status(500).json({
      message: "Failed to retrieve CV",
      error: err.message
    });
  }
};

export const getUserCVs = async (req, res) => {
  try {
    const cvs = await CV.find({ userId: req.userId });
    res.status(200).json({
      message: "User CVs retrieved successfully",
      cvs
    });
  } catch (err) {
    console.error("Error retrieving user CVs:", err);
    res.status(500).json({
      message: "Failed to retrieve user CVs",
      error: err.message
    });
  }
};

export const publishCV = async (req, res) => {
  const { cvId } = req.params;

  try {
    const cv = await CV.findById(cvId);
    if (!cv) {
      return res.status(404).json({
        message: "CV not found"
      });
    }

    // Check if user owns the CV
    if (cv.userId.toString() !== req.userId) {
      return res.status(403).json({
        message: "Access denied: You can only publish your own CV"
      });
    }

    cv.isPublished = true;
    await cv.save();

    res.status(200).json({
      message: "CV published successfully",
      cv
    });
  } catch (err) {
    console.error("Error publishing CV:", err);
    res.status(500).json({
      message: "Failed to publish CV",
      error: err.message
    });
  }
};