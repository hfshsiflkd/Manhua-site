"use strict";

const { canCreateTeam } = require("../config/selfServeTeam");
const {
  canAccessEditorWorkspace,
  isPublisherRole,
} = require("./teamAccessService");

function emptyPages() {
  return {
    admin: false,
    editor: false,
    editorCreateManhua: false,
    editorCreateTeam: false,
    editorLeaderboard: false,
  };
}

function pagesFromFacts({ role, blocked, isActive, editorWorkspace, createTeam }) {
  if (blocked === true || isActive === false) {
    return emptyPages();
  }
  const normalized = String(role || "user").toLowerCase();
  const publisher = isPublisherRole(normalized);
  const admin = normalized === "admin";
  return {
    admin,
    editor: Boolean(editorWorkspace),
    editorCreateManhua: publisher,
    editorCreateTeam: Boolean(createTeam),
    editorLeaderboard: normalized === "admin" || normalized === "editor",
  };
}

async function buildPageAccess(user) {
  const role = String(user?.role || "user").toLowerCase();
  if (!user || user.blocked === true || user.isActive === false) {
    return {
      ok: false,
      role,
      teamMember: false,
      canPublishManhua: false,
      canCreateTeam: false,
      pages: emptyPages(),
    };
  }

  const editorWorkspace = await canAccessEditorWorkspace(user);
  const publisher = isPublisherRole(role);
  const createTeam = canCreateTeam(user);
  const pages = pagesFromFacts({
    role,
    blocked: user.blocked,
    isActive: user.isActive,
    editorWorkspace,
    createTeam,
  });

  return {
    ok: pages.admin || pages.editor,
    role,
    teamMember: editorWorkspace,
    canPublishManhua: publisher,
    canCreateTeam: createTeam,
    pages,
  };
}

module.exports = {
  emptyPages,
  pagesFromFacts,
  buildPageAccess,
};
