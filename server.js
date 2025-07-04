const express = require("express");
const app = express();
const stripe = require("stripe")("sk_test_yourSecretKey"); // Dein Secret Key

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
            unit_amount: 1999, // in Cent: $19.99
          },
          quantity: 1,
        },
      ],
      success_url: "https://deine-domain.com/success",
      cancel_url: "https://deine-domain.com/cancel",
    });

    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3000, () => console.log("Server läuft auf http://localhost:3000"));