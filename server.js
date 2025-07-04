const express = require("express");
const cors = require("cors");
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const mysql = require("mysql2/promise");

const app = express();

app.use(cors({ origin: "https://www.olympspa.com" }));
app.use(express.static("public"));
app.use(express.json());

// MySQL-Pool (über Swizzonic)
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
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction(); // Transaktion starten

    // 1. Lager prüfen + sperren
    const [rows] = await connection.query(
      "SELECT bestand FROM lagerbestand WHERE produktname = ? FOR UPDATE",
      ["T-Shirt"]
    );

    if (!rows.length || rows[0].bestand < 1) {
      await connection.rollback(); // Transaktion zurückrollen
      return res.status(400).json({ error: "Produkt nicht auf Lager." });
    }

    // 2. Stripe-Session erstellen
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

    // 3. Verkauf speichern
    await connection.query(
      "INSERT INTO verkaufte_artikel (produktname, betrag) VALUES (?, ?)",
      ["T-Shirt", 1999]
    );

    // 4. Bestand reduzieren
    await connection.query(
      "UPDATE lagerbestand SET bestand = bestand - 1 WHERE produktname = ?",
      ["T-Shirt"]
    );

    await connection.commit(); // Transaktion abschließen
    res.json({ url: session.url });

  } catch (e) {
    if (connection) await connection.rollback(); // Fehler? Rollback!
    console.error("❌ Fehler beim Checkout:", e);
    res.status(500).json({ error: "Interner Serverfehler" });
  } finally {
    if (connection) connection.release();
  }
});

// Route für Lagerbestand
app.get("/lagerbestand", async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query("SELECT produktname, bestand FROM lagerbestand");
    res.json(rows);
  } catch (e) {
    console.error("Fehler beim Abfragen des Lagerbestands:", e);
    res.status(500).json({ error: "Interner Serverfehler" });
  } finally {
    if (connection) connection.release();
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Server läuft auf http://localhost:${port}`));