"use strict";

const {
  FieldError,
  getPublicCreator,
  getOwnCreatorProfile,
  updateOwnCreatorProfile,
} = require("../services/creatorProfileService");

function sendFieldError(res, err) {
  return res.status(400).json({
    success: false,
    message: err.message,
    code: err.code,
    fields: err.fields,
  });
}

exports.getPublicCreator = async (req, res, next) => {
  try {
    const profile = await getPublicCreator(req.params.id, req.query);
    return res.json(profile);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return next(err);
  }
};

exports.getOwnCreatorProfile = async (req, res, next) => {
  try {
    const profile = await getOwnCreatorProfile(req.user);
    return res.json(profile);
  } catch (err) {
    if (err instanceof FieldError) return sendFieldError(res, err);
    if (err.statusCode && err.statusCode < 500) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        code: err.code || undefined,
      });
    }
    return next(err);
  }
};

exports.updateOwnCreatorProfile = async (req, res, next) => {
  try {
    const profile = await updateOwnCreatorProfile(req.user, req.body);
    return res.json({ success: true, profile });
  } catch (err) {
    if (err instanceof FieldError) return sendFieldError(res, err);
    if (err.statusCode && err.statusCode < 500) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        code: err.code || undefined,
        fields: err.fields,
      });
    }
    return next(err);
  }
};
