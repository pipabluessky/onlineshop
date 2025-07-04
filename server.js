const express = require("express");
const cors = require("cors");
const stripe = require("stripe")("sk_test_yourSecretKey"); // ⬅️ Ersetze durch deinen echten Stripe Secret Key

const app = express();

app.use(cors({
  origin: "https://www.olympspa.com"
}));

app.use(express.static("public"));
app.use(express.json());

app.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Beispielprodukt",
            },
            unit_amount: 1999, // Preis in Cent ($19.99)
          },
          quantity: 1,
        },
      ],
      success_url: "https://www.olympspa.com/success.html",
      cancel_url: "https://www.olympspa.com/cancel.html",
    });

    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server läuft auf http://localhost:${port}`));