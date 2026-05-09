// backend/src/routes/editorRoutes.js
const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authMiddleware");
const {
  getMyManhuas,
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

// Leaderboard should be visible to editors + admins (NOT translators)
router.get("/leaderboard", requireRole("admin", "editor"), getEditorLeaderboard);

// The rest of the editor area can be used by admin/editor/translator
router.use(requireRole("admin", "editor", "translator"));

// өөрийнхөө манхуа жагсаалт
router.get("/manhuas/mine", getMyManhuas);

// шинэ манхуа үүсгэх
router.post("/manhuas", createManhua);

// манхуа update хийх
router.patch("/manhuas/:id", updateManhua);

// манхуа устгах (admin бүгдийг, editor өөрийнхийг)
router.delete("/manhuas/:id", deleteManhua);

// ✅ EDITOR: өөрийн manhua-ны chapter-ууд (LIST)
router.get("/manhuas/:slug/chapters", editorListChaptersOfManhua);

// ✅ EDITOR: шинэ chapter үүсгэх (CREATE)
router.post("/manhuas/:slug/chapters", editorCreateChapter);

// ✅ EDITOR: chapter one by id
router.get("/chapters/:id", editorGetChapterById);
router.put("/chapters/:id", editorUpdateChapter);
router.delete("/chapters/:id", editorDeleteChapter);

// ✅ EDITOR: teams
router.use("/teams", requireRole("admin", "editor"));
router.get("/teams", listTeams);
router.post("/teams", createTeam);
router.get("/teams/:id", getTeam);
router.patch("/teams/:id", updateTeam);
router.delete("/teams/:id", deleteTeam);
router.post("/teams/:id/members", addTeamMember);
router.patch("/teams/:id/members/:userId", updateMemberRole);
router.delete("/teams/:id/members/:userId", removeMember);
router.get("/teams/:id/invites", listTeamInvites);
router.post("/teams/:id/invites/:inviteId/accept", acceptTeamInvite);
router.post("/teams/:id/invites/:inviteId/decline", declineTeamInvite);
router.get("/teams/:id/manhuas", listTeamManhuas);

// ✅ EDITOR: my pending team invites
router.get("/team-invites", listMyTeamInvites);

module.exports = router;
