export type PageFlags = {
  admin: boolean;
  editor: boolean;
  editorCreateManhua: boolean;
  editorCreateTeam: boolean;
  editorLeaderboard: boolean;
};

export type PageAccess = {
  ok: boolean;
  role: string;
  teamMember: boolean;
  canPublishManhua: boolean;
  canCreateTeam: boolean;
  pages: PageFlags;
};

export const EMPTY_PAGE_FLAGS: PageFlags = {
  admin: false,
  editor: false,
  editorCreateManhua: false,
  editorCreateTeam: false,
  editorLeaderboard: false,
};

export function normalizePathname(pathname: string): string {
  if (!pathname) return "/";
  const noQuery = pathname.split("?")[0].split("#")[0];
  if (noQuery.length > 1 && noQuery.endsWith("/")) return noQuery.slice(0, -1);
  return noQuery || "/";
}

export function isProtectedAppPath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  return path === "/admin" || path.startsWith("/admin/") || path === "/editor" || path.startsWith("/editor/");
}

export function pathAllowed(pathname: string, pages: PageFlags | null | undefined): boolean {
  const path = normalizePathname(pathname);
  const flags = pages || EMPTY_PAGE_FLAGS;
  if (path === "/admin" || path.startsWith("/admin/")) return Boolean(flags.admin);
  if (path === "/editor/manhuas/new" || path.startsWith("/editor/manhuas/new/")) {
    return Boolean(flags.editorCreateManhua);
  }
  if (path === "/editor/teams/new" || path.startsWith("/editor/teams/new/")) {
    return Boolean(flags.editorCreateTeam);
  }
  if (path === "/editor/leaderboard" || path.startsWith("/editor/leaderboard/")) {
    return Boolean(flags.editorLeaderboard);
  }
  if (path === "/editor" || path.startsWith("/editor/")) return Boolean(flags.editor);
  return true;
}

export type DocumentGate = "allow" | "notfound" | "unavailable";

export function decideDocumentGate(opts: {
  pathname: string;
  cookieValid: boolean;
  fetchFailed: boolean;
  access: PageAccess | null;
}): DocumentGate {
  if (!isProtectedAppPath(opts.pathname)) return "allow";
  if (!opts.cookieValid) return "notfound";
  if (opts.fetchFailed) return "unavailable";
  if (!opts.access || !pathAllowed(opts.pathname, opts.access.pages)) return "notfound";
  return "allow";
}
