const express = require("express");
const cors = require("cors");
const stripe = require("stripe")("sk_test_yourSecretKey"); // ⬅️ echten Secret Key einfügen
const mysql = require("mysql2/promise");

const app = express();

app.use(cors({ origin: "https://www.olympspa.com" }));
app.use(express.static("public"));
app.use(express.json());

// MySQL-Datenbankverbindung (über Swizzonic)
const pool = mysql.createPool({
  host: "lhcp5014.webapps.net",
  user: "bt6iim29_lagerbestand",
  password: "Ganesha1966!!",
  database: "bt6iim29_lagerbestand",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.post("/create-checkout-session", async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // Lagerbestand prüfen
    const [rows] = await connection.query(
      "SELECT * FROM lagerbestand WHERE produktname = ?",
      ["T-Shirt"]
    );

    const produkt = rows[0];
    if (!produkt || produkt.bestand < 1) {
      connection.release();
      return res.status(400).json({ error: "Produkt nicht auf Lager." });
    }

    // Stripe Checkout Session erstellen
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "T-Shirt",
            },
            unit_amount: 1999,
          },
          quantity: 1,
        },
      ],
      success_url: "https://www.olympspa.com/success.html",
      cancel_url: "https://www.olympspa.com/cancel.html",
    });

    // Verkauf protokollieren
    await connection.query(
      "INSERT INTO verkaufte_artikel (produktname, betrag) VALUES (?, ?)",
      ["T-Shirt", 1999]
    );

    // Lagerbestand aktualisieren
    await connection.query(
      "UPDATE lagerbestand SET bestand = bestand - 1 WHERE produktname = ?",
      ["T-Shirt"]
    );

    connection.release();
    res.json({ url: session.url });
  } catch (e) {
    console.error("Fehler:", e);
    res.status(500).json({ error: "Interner Serverfehler: " + e.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server läuft auf http://localhost:${port}`));