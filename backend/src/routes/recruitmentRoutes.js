"use strict";

const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { createListingLimiter, applyListingLimiter } = require("../middleware/recruitmentLimiter");
const ctrl = require("../controllers/teamRecruitmentController");

const router = express.Router();

router.get("/", ctrl.listPublic);
router.get("/teams/:teamId/manage", protect, ctrl.listMineForTeam);
router.get("/manage/:id/applications", protect, ctrl.listApplications);
router.get("/manage/:id", protect, ctrl.getMine);
router.patch("/manage/:id", protect, ctrl.update);
router.post("/applications/:applicationId/decision", protect, ctrl.decide);
router.post("/applications/:applicationId/withdraw", protect, ctrl.withdraw);
router.post("/", protect, createListingLimiter, ctrl.create);
router.post("/:id/applications", protect, applyListingLimiter, ctrl.apply);
router.get("/:id", ctrl.getPublic);

module.exports = router;
