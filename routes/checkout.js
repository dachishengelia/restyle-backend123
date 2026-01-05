import express from "express";
import Stripe from "stripe";
const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post("/create-checkout-session", async (req, res) => {
  const { items } = req.body;
  try {
    const line_items = items.map(item => ({
      price_data: {
        currency: "gel", // GEL for your case
        product_data: {
          name: item.name,
        },
        unit_amount: item.price * 100, // Stripe expects the smallest currency unit
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/success`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
