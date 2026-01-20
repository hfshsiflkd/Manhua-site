const router = require("express").Router();
const { protect } = require("../middleware/authMiddleware");
const {
  listRequests,
  createRequest,
  voteRequest,
} = require("../controllers/requestController");

router.get("/", listRequests);
router.post("/", protect, createRequest);
router.post("/:id/vote", protect, voteRequest);

module.exports = router;
