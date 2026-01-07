const express = require("express");
const router = express.Router();

const { getMonthlyFinance } = require("../../controllers/admin");

// AdminRoutes already applies protect + adminOnly
router.get("/", getMonthlyFinance);

module.exports = router;

