"use strict";

const {
  FieldError,
  HttpError,
  listPublicListings,
  getPublicListing,
  createListing,
  listTeamListings,
  getOwnerListing,
  updateListing,
  hideListing,
  applyToListing,
  listMyApplications,
  withdrawApplication,
  listListingApplications,
  decideApplication,
} = require("../services/teamRecruitmentService");
const { canAccessEditorWorkspace, isPublisherRole } = require("../services/teamAccessService");
const { logAudit } = require("../utils/auditLogger");
const { invalidateUserCache } = require("../middleware/authMiddleware");

function sendFieldError(res, err) {
  return res.status(400).json({
    success: false,
    message: err.message,
    code: err.code,
    fields: err.fields,
  });
}

function sendHttpError(res, err) {
  return res.status(err.statusCode).json({
    success: false,
    message: err.message,
    code: err.code || undefined,
    fields: err.fields,
  });
}

function handle(err, res, next) {
  if (err instanceof FieldError) return sendFieldError(res, err);
  if (err instanceof HttpError || (err.statusCode && err.statusCode < 500)) {
    return sendHttpError(res, err);
  }
  return next(err);
}

exports.listPublic = async (req, res, next) => {
  try {
    const data = await listPublicListings(req.query);
    return res.json(data);
  } catch (err) {
    return handle(err, res, next);
  }
};

exports.getPublic = async (req, res, next) => {
  try {
    const data = await getPublicListing(req.params.id);
    return res.json(data);
  } catch (err) {
    return handle(err, res, next);
  }
};

exports.create = async (req, res, next) => {
  try {
    const listing = await createListing(req.user, req.body);
    logAudit(req, {
      level: "INFO",
      category: "content",
      action: "recruitment_listing_create",
      message: `Recruitment listing created: ${listing.id}`,
      meta: { listingId: listing.id, teamId: listing.team?.id },
    }).catch(() => {});
    return res.status(201).json(listing);
  } catch (err) {
    return handle(err, res, next);
  }
};

exports.listMineForTeam = async (req, res, next) => {
  try {
    const items = await listTeamListings(req.user, req.params.teamId);
    return res.json({ items });
  } catch (err) {
    return handle(err, res, next);
  }
};

exports.getMine = async (req, res, next) => {
  try {
    const listing = await getOwnerListing(req.user, req.params.id);
    return res.json(listing);
  } catch (err) {
    return handle(err, res, next);
  }
};

exports.update = async (req, res, next) => {
  try {
    const listing = await updateListing(req.user, req.params.id, req.body);
    return res.json(listing);
  } catch (err) {
    return handle(err, res, next);
  }
};

exports.hide = async (req, res, next) => {
  try {
    const result = await hideListing(req.user, req.params.id);
    logAudit(req, {
      level: "WARN",
      category: "admin",
      action: "recruitment_listing_hide",
      message: `Recruitment listing hidden: ${req.params.id}`,
      meta: { listingId: req.params.id },
    }).catch(() => {});
    return res.json(result);
  } catch (err) {
    return handle(err, res, next);
  }
};

exports.apply = async (req, res, next) => {
  try {
    const application = await applyToListing(req.user, req.params.id, req.body);
    logAudit(req, {
      level: "INFO",
      category: "content",
      action: "recruitment_apply",
      message: `Recruitment application submitted: ${application.id}`,
      meta: { listingId: req.params.id, applicationId: application.id },
    }).catch(() => {});
    return res.status(201).json(application);
  } catch (err) {
    return handle(err, res, next);
  }
};

exports.listMineApplications = async (req, res, next) => {
  try {
    const items = await listMyApplications(req.user);
    return res.json({ items });
  } catch (err) {
    return handle(err, res, next);
  }
};

exports.withdraw = async (req, res, next) => {
  try {
    const result = await withdrawApplication(req.user, req.params.applicationId);
    return res.json(result);
  } catch (err) {
    return handle(err, res, next);
  }
};

exports.listApplications = async (req, res, next) => {
  try {
    const items = await listListingApplications(req.user, req.params.id, req.query.status);
    return res.json({ items });
  } catch (err) {
    return handle(err, res, next);
  }
};

exports.decide = async (req, res, next) => {
  try {
    const result = await decideApplication(req.user, req.params.applicationId, {
      action: req.body?.action,
      decisionNote: req.body?.decisionNote,
    });
    if (result.applicantId) {
      await invalidateUserCache(String(result.applicantId));
    }
    logAudit(req, {
      level: "INFO",
      category: "content",
      action: `recruitment_${result.status}`,
      message: `Recruitment application ${result.status}: ${req.params.applicationId}`,
      meta: { applicationId: req.params.applicationId, status: result.status },
    }).catch(() => {});
    const payload = { ...result };
    delete payload.applicantId;
    return res.json(payload);
  } catch (err) {
    return handle(err, res, next);
  }
};

exports.getWorkspace = async (req, res, next) => {
  try {
    const role = String(req.user?.role || "user");
    const teamMember = await canAccessEditorWorkspace(req.user);
    return res.json({
      role,
      teamMember,
      canPublishManhua: isPublisherRole(role),
    });
  } catch (err) {
    return handle(err, res, next);
  }
};
