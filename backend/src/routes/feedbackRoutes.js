const router = require("express").Router();

const { submitFeedback } = require("../controllers/feedbackController");

router.post("/", submitFeedback);

module.exports = router;

