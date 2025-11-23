const express = require("express");
const router = express.Router();

const { protect } = require("../../middleware/authMiddleware");
const adminOnly = require("../../middleware/adminOnly");

const {
  listUsers,
  setVIP,
} = require("../../controllers/adminUserController");

// зөвхөн админ
router.use(protect);
router.use(adminOnly);

router.get("/", listUsers);
router.patch("/:id/vip", setVIP);

module.exports = router;
