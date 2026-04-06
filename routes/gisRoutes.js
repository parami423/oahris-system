const express = require("express");
const router  = express.Router();
const db      = require("../config/db");


// ─────────────────────────────────────────────
// GET /api/gis/sites/map
// Returns all sites with coordinates for map markers
// ─────────────────────────────────────────────
router.get("/sites/map", (req, res) => {
  const sql = `
    SELECT 
      s.site_id, s.site_name, s.latitude, s.longitude,
      s.district, s.province, s.time_period, s.site_type,
      s.elevation, s.protected_status, s.risk_level, s.description,
      COUNT(DISTINCT sk.skeleton_id) AS skeleton_count
    FROM sites s
    LEFT JOIN skeletons sk ON s.site_id = sk.site_id
    WHERE s.latitude IS NOT NULL AND s.longitude IS NOT NULL
    GROUP BY s.site_id
    ORDER BY s.time_period DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: err.message });
    }

    res.json({ success: true, count: results.length, data: results });
  });
});


// ─────────────────────────────────────────────
// GET /api/gis/sites/temporal
// Returns sites with temporal + biological info
// ─────────────────────────────────────────────
router.get("/sites/temporal", (req, res) => {
  const sql = `
    SELECT 
      s.site_id, s.site_name, s.latitude, s.longitude,
      s.district, s.time_period, s.site_type,
      COUNT(DISTINCT sk.skeleton_id) AS skeleton_count,
      GROUP_CONCAT(DISTINCT bp.gender) AS genders
    FROM sites s
    LEFT JOIN skeletons sk ON s.site_id = sk.site_id
    LEFT JOIN biological_profiles bp ON sk.skeleton_id = bp.skeleton_id
    WHERE s.latitude IS NOT NULL AND s.longitude IS NOT NULL
    GROUP BY s.site_id
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: err.message });
    }

    res.json({ success: true, data: results });
  });
});


// ─────────────────────────────────────────────
// GET /api/gis/sites/cluster-data
// Returns coordinate data for clustering (DBSCAN etc.)
// ─────────────────────────────────────────────
router.get("/sites/cluster-data", (req, res) => {
  const sql = `
    SELECT 
      s.site_id AS id,
      s.site_name AS name,
      s.latitude AS lat,
      s.longitude AS lng,
      s.site_type AS type,
      s.district,
      s.time_period AS period,
      s.risk_level,
      COUNT(sk.skeleton_id) AS skeletons
    FROM sites s
    LEFT JOIN skeletons sk ON s.site_id = sk.site_id
    WHERE s.latitude IS NOT NULL AND s.longitude IS NOT NULL
    GROUP BY s.site_id
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: err.message });
    }

    res.json({ success: true, data: results });
  });
});


// ─────────────────────────────────────────────
// GET /api/gis/sites/by-district
// Heatmap / aggregation by district
// ─────────────────────────────────────────────
router.get("/sites/by-district", (req, res) => {
  const sql = `
    SELECT 
      district,
      COUNT(*) AS site_count,
      AVG(latitude)  AS center_lat,
      AVG(longitude) AS center_lng,
      GROUP_CONCAT(DISTINCT site_type) AS types
    FROM sites
    WHERE latitude IS NOT NULL
    GROUP BY district
    ORDER BY site_count DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: err.message });
    }

    res.json({ success: true, data: results });
  });
});


// ─────────────────────────────────────────────
// GET /api/gis/sites/excavation-phases
// Group sites by excavation phase
// ─────────────────────────────────────────────
router.get("/sites/excavation-phases", (req, res) => {
  const sql = `
    SELECT 
      s.site_id, s.site_name, s.latitude, s.longitude,
      s.time_period, s.district, s.site_type,
      CASE
        WHEN s.time_period LIKE '%Mesolithic%' 
          OR s.time_period LIKE '%14000%' 
          OR s.time_period LIKE '%12000%' 
          OR s.time_period LIKE '%10000%' THEN 'Phase I'
        WHEN s.time_period LIKE '%6000%' 
          OR s.time_period LIKE '%8000%' 
          OR s.time_period LIKE '%Neolithic%' THEN 'Phase II'
        WHEN s.time_period LIKE '%Iron Age%' 
          OR s.time_period LIKE '%3000%' 
          OR s.time_period LIKE '%2000%' THEN 'Phase III'
        ELSE 'Phase IV'
      END AS excavation_phase,
      COUNT(sk.skeleton_id) AS skeleton_count
    FROM sites s
    LEFT JOIN skeletons sk ON s.site_id = sk.site_id
    WHERE s.latitude IS NOT NULL
    GROUP BY s.site_id
    ORDER BY excavation_phase
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: err.message });
    }

    res.json({ success: true, data: results });
  });
});


// ─────────────────────────────────────────────
// GET /api/gis/spatial-stats
// Dashboard statistics
// ─────────────────────────────────────────────
router.get("/spatial-stats", (req, res) => {

  const queries = {
    total_mapped: "SELECT COUNT(*) as count FROM sites WHERE latitude IS NOT NULL",
    by_type: "SELECT site_type, COUNT(*) as count FROM sites GROUP BY site_type",
    by_period: "SELECT time_period, COUNT(*) as count FROM sites WHERE time_period IS NOT NULL GROUP BY time_period",
    protected_count: "SELECT COUNT(*) as count FROM sites WHERE protected_status = 1",
    high_risk: "SELECT COUNT(*) as count FROM sites WHERE risk_level = 'High'",
  };

  const results = {};
  const keys = Object.keys(queries);
  let completed = 0;

  keys.forEach(key => {
    db.query(queries[key], (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: err.message });
      }

      // ✅ Proper handling
      if (key === "by_type" || key === "by_period") {
        results[key] = rows; // array
      } else {
        results[key] = rows[0]?.count || 0; // safe access
      }

      completed++;

      if (completed === keys.length) {
        res.json({ success: true, data: results });
      }
    });
  });
});


module.exports = router;