// backend/src/routes/editorRoutes.js
const express = require("express");
const router = express.Router();

const { protect, requireRole, requireStaffOrTeamMember } = require("../middleware/authMiddleware");
const { createTeamLimiter } = require("../middleware/teamCreateLimiter");
const {
  getMyManhuas,
  getSimilarManhuas,
  createManhua,
  updateManhua,
  deleteManhua,
} = require("../controllers/editorController");
const { getEditorLeaderboard } = require("../controllers/editorLeaderboardController");

const {
  editorListChaptersOfManhua,
  editorGetChapterById,
  editorUpdateChapter,
  editorCreateChapter,
  editorDeleteChapter,
} = require("../controllers/chapterController");
const {
  listTeams,
  createTeam,
  getTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  updateMemberRole,
  removeMember,
  listTeamInvites,
  listMyTeamInvites,
  acceptTeamInvite,
  declineTeamInvite,
  listTeamManhuas,
} = require("../controllers/teamController");

// бүх editor route-ууд auth шаардлагатай
router.use(protect);

const staff = requireRole("admin", "editor", "translator");
const publisher = requireRole("admin", "editor", "translator");
const editorAdmin = requireRole("admin", "editor");

// Leaderboard should be visible to editors + admins (NOT translators)
router.get("/leaderboard", requireRole("admin", "editor"), getEditorLeaderboard);

// Team members (site role=user) may work on accepted team manhua only.
// Creating a personal manhua still requires editor/translator/admin.
router.get("/manhuas/mine", requireStaffOrTeamMember, getMyManhuas);
router.get("/manhuas/similar", staff, getSimilarManhuas);
router.post("/manhuas", publisher, createManhua);
router.patch("/manhuas/:id", requireStaffOrTeamMember, updateManhua);
router.delete("/manhuas/:id", requireStaffOrTeamMember, deleteManhua);
router.get("/manhuas/:slug/chapters", requireStaffOrTeamMember, editorListChaptersOfManhua);
router.post("/manhuas/:slug/chapters", requireStaffOrTeamMember, editorCreateChapter);
router.get("/chapters/:id", requireStaffOrTeamMember, editorGetChapterById);
router.put("/chapters/:id", requireStaffOrTeamMember, editorUpdateChapter);
router.delete("/chapters/:id", requireStaffOrTeamMember, editorDeleteChapter);

router.get("/teams", requireStaffOrTeamMember, listTeams);
router.post("/teams", editorAdmin, createTeamLimiter, createTeam);
router.get("/teams/:id", requireStaffOrTeamMember, getTeam);
router.patch("/teams/:id", editorAdmin, updateTeam);
router.delete("/teams/:id", editorAdmin, deleteTeam);
router.post("/teams/:id/members", editorAdmin, addTeamMember);
router.patch("/teams/:id/members/:userId", editorAdmin, updateMemberRole);
router.delete("/teams/:id/members/:userId", editorAdmin, removeMember);
router.get("/teams/:id/invites", editorAdmin, listTeamInvites);
router.post("/teams/:id/invites/:inviteId/accept", editorAdmin, acceptTeamInvite);
router.post("/teams/:id/invites/:inviteId/decline", editorAdmin, declineTeamInvite);
router.get("/teams/:id/manhuas", requireStaffOrTeamMember, listTeamManhuas);
router.get("/team-invites", requireStaffOrTeamMember, listMyTeamInvites);

module.exports = router;
