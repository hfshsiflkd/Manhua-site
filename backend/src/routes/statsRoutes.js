const express = require("express");
const router = express.Router();
const {
  getTrending,
  healthCheck,
} = require("../controllers/statsController");

router.get("/trending", getTrending);
router.get("/health", healthCheck);

module.exports = router;
