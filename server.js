const express = require("express");
const cors = require("cors");

const app = express();

// ==============================
// MIDDLEWARE
// ==============================
app.use(cors());
app.use(express.json());

// ==============================
// IMPORT ROUTES
// ==============================
const gisRoutes = require("./routes/gisRoutes");

// ==============================
// USE ROUTES
// ==============================
app.use("/api/gis", gisRoutes);

// ==============================
// BASIC TEST ROUTE
// ==============================
app.get("/", (req, res) => {
  res.send("OAHRIS Backend Running 🚀");
});

// ==============================
// BASIC SITES APIs
// ==============================
const db = require("./config/db"); // ✅ USE SHARED DB

// GET all sites
app.get("/sites", (req, res) => {
  db.query("SELECT * FROM sites", (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Database error");
    }
    res.json(result);
  });
});

// ADD new site
app.post("/sites", (req, res) => {
  const { site_name, district, latitude, longitude, elevation, time_period } = req.body;

  const sql = `
    INSERT INTO sites (site_name, district, latitude, longitude, elevation, time_period)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [site_name, district, latitude, longitude, elevation, time_period],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Error inserting data");
      }
      res.send("Site added successfully ✅");
    }
  );
});

// ==============================
// START SERVER
// ==============================
app.listen(5000, () => {
  console.log("Server running on http://localhost:5000 🚀");
});