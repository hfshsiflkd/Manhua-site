const Team = require("../models/Team");
const TeamInvite = require("../models/TeamInvite");
const User = require("../models/User");
const Manhua = require("../models/Manhua");
const Chapter = require("../models/Chapter");
const cache = require("../utils/cache");

function isGlobalAdmin(req) {
  return String(req.user?.role || "") === "admin";
}

function getMemberRole(team, userId) {
  return team.members?.find((m) => {
    const memberId =
      typeof m.user === "object" && m.user !== null ? m.user._id : m.user;
    return String(memberId) === String(userId);
  })?.role;
}

function isTeamAdminRole(role) {
  return role === "owner" || role === "admin";
}

function invalidateUserManhuaCache(userId) {
  if (!userId) return;
  cache.del(`editor:manhuas:mine:${String(userId)}`);
}

exports.listTeams = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const teams = await Team.find({ "members.user": userId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(
      teams.map((t) => ({
        ...t,
        membersCount: t.members?.length || 0,
      }))
    );
  } catch (err) {
    next(err);
  }
};

exports.createTeam = async (req, res, next) => {
  try {
    if (!isGlobalAdmin(req)) {
      return res.status(403).json({ message: "Зөвхөн admin баг үүсгэнэ" });
    }

    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Team нэр шаардлагатай" });
    }

    const team = await Team.create({
      name: name.trim(),
      description: description?.trim() || "",
      createdBy: req.user._id,
      members: [
        {
          user: req.user._id,
          role: "owner",
          addedBy: req.user._id,
        },
      ],
    });

    res.status(201).json(team);
  } catch (err) {
    next(err);
  }
};

exports.getTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate("createdBy", "username email role")
      .populate("members.user", "username email role")
      .lean();

    if (!team) {
      return res.status(404).json({ message: "Team олдсонгүй" });
    }

    const role = getMemberRole(team, req.user._id);
    if (!role && !isGlobalAdmin(req)) {
      return res.status(403).json({ message: "No permission" });
    }

    res.json({
      ...team,
      membersCount: team.members?.length || 0,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateTeam = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ message: "Team олдсонгүй" });
    }

    const role = getMemberRole(team, req.user._id);
    if (!isGlobalAdmin(req) && !isTeamAdminRole(role)) {
      return res.status(403).json({ message: "No permission" });
    }

    if (name !== undefined) team.name = String(name).trim();
    if (description !== undefined) team.description = String(description).trim();

    await team.save();
    res.json(team);
  } catch (err) {
    next(err);
  }
};

exports.deleteTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id).lean();
    if (!team) {
      return res.status(404).json({ message: "Team олдсонгүй" });
    }

    const role = getMemberRole(team, req.user._id);
    if (!isGlobalAdmin(req) && role !== "owner") {
      return res.status(403).json({ message: "No permission" });
    }

    await Team.deleteOne({ _id: team._id });
    await Manhua.updateMany({ team: team._id }, { $unset: { team: "" } });

    for (const m of team.members || []) {
      invalidateUserManhuaCache(m.user);
    }

    res.json({ message: "Team deleted" });
  } catch (err) {
    next(err);
  }
};

exports.addTeamMember = async (req, res, next) => {
  try {
    const { userId, username, email, role } = req.body;
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ message: "Team олдсонгүй" });
    }

    const actorRole = getMemberRole(team, req.user._id);
    if (!isGlobalAdmin(req) && !isTeamAdminRole(actorRole)) {
      return res.status(403).json({ message: "No permission" });
    }

    let user = null;
    if (userId) {
      user = await User.findById(userId);
    } else if (email) {
      user = await User.findOne({ email: String(email).toLowerCase() });
    } else if (username) {
      user = await User.findOne({ username: String(username) });
    }

    if (!user) {
      return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });
    }

    const exists = team.members.some(
      (m) => String(m.user) === String(user._id)
    );
    if (exists) {
      return res.status(400).json({ message: "Хэрэглэгч аль хэдийн багт байна" });
    }

    const existingInvite = await TeamInvite.findOne({
      team: team._id,
      invitedUser: user._id,
      status: "pending",
    }).lean();

    if (existingInvite) {
      return res.status(400).json({ message: "Хүсэлт аль хэдийн илгээгдсэн" });
    }

    const userRole = String(user.role || "");
    const memberRole =
      userRole === "admin" || userRole === "editor"
        ? role === "admin"
          ? "admin"
          : "editor"
        : "editor";
    const invite = await TeamInvite.create({
      team: team._id,
      invitedUser: user._id,
      invitedBy: req.user._id,
      role: memberRole,
      status: "pending",
    });

    res.json({
      message: "Хүсэлт илгээгдлээ",
      invite,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateMemberRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ message: "Team олдсонгүй" });
    }

    const actorRole = getMemberRole(team, req.user._id);
    if (!isGlobalAdmin(req) && !isTeamAdminRole(actorRole)) {
      return res.status(403).json({ message: "No permission" });
    }

    const member = team.members.find(
      (m) => String(m.user) === String(req.params.userId)
    );
    if (!member) {
      return res.status(404).json({ message: "Гишүүн олдсонгүй" });
    }

    if (member.role === "owner") {
      return res
        .status(400)
        .json({ message: "Owner-ийн role өөрчлөх боломжгүй" });
    }

    member.role = role === "admin" ? "admin" : "editor";
    await team.save();

    const updated = await Team.findById(team._id)
      .populate("createdBy", "username email role")
      .populate("members.user", "username email role")
      .lean();
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.removeMember = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ message: "Team олдсонгүй" });
    }

    const actorRole = getMemberRole(team, req.user._id);
    if (!isGlobalAdmin(req) && !isTeamAdminRole(actorRole)) {
      return res.status(403).json({ message: "No permission" });
    }

    const member = team.members.find(
      (m) => String(m.user) === String(req.params.userId)
    );
    if (!member) {
      return res.status(404).json({ message: "Гишүүн олдсонгүй" });
    }

    if (member.role === "owner") {
      return res
        .status(400)
        .json({ message: "Owner-ийг устгах боломжгүй" });
    }

    team.members = team.members.filter(
      (m) => String(m.user) !== String(req.params.userId)
    );
    await team.save();
    invalidateUserManhuaCache(req.params.userId);

    const updated = await Team.findById(team._id)
      .populate("createdBy", "username email role")
      .populate("members.user", "username email role")
      .lean();
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.listTeamInvites = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id).lean();
    if (!team) {
      return res.status(404).json({ message: "Team олдсонгүй" });
    }

    const role = getMemberRole(team, req.user._id);
    if (!isGlobalAdmin(req) && !isTeamAdminRole(role)) {
      return res.status(403).json({ message: "No permission" });
    }

    const invites = await TeamInvite.find({ team: team._id })
      .populate("invitedUser", "username email role")
      .populate("invitedBy", "username email role")
      .sort({ createdAt: -1 })
      .lean();

    res.json(invites);
  } catch (err) {
    next(err);
  }
};

exports.listMyTeamInvites = async (req, res, next) => {
  try {
    const invites = await TeamInvite.find({
      invitedUser: req.user._id,
      status: "pending",
    })
      .populate("team", "name description")
      .populate("invitedBy", "username email role")
      .sort({ createdAt: -1 })
      .lean();

    res.json(invites);
  } catch (err) {
    next(err);
  }
};

exports.acceptTeamInvite = async (req, res, next) => {
  try {
    const invite = await TeamInvite.findById(req.params.inviteId);
    if (!invite) {
      return res.status(404).json({ message: "Хүсэлт олдсонгүй" });
    }

    if (String(invite.invitedUser) !== String(req.user._id)) {
      return res.status(403).json({ message: "No permission" });
    }

    if (invite.status !== "pending") {
      return res.status(400).json({ message: "Хүсэлтийн төлөв буруу байна" });
    }

    const team = await Team.findById(invite.team);
    if (!team) {
      return res.status(404).json({ message: "Team олдсонгүй" });
    }

    const alreadyMember = team.members.some(
      (m) => String(m.user) === String(invite.invitedUser)
    );
    if (!alreadyMember) {
      team.members.push({
        user: invite.invitedUser,
        role: invite.role,
        addedBy: invite.invitedBy,
      });
      await team.save();
    }

    const invitedUser = await User.findById(invite.invitedUser);
    if (invitedUser && String(invitedUser.role || "") === "user") {
      invitedUser.role = "editor";
      await invitedUser.save();
    }

    invite.status = "accepted";
    invite.respondedAt = new Date();
    await invite.save();

    invalidateUserManhuaCache(req.user._id);

    res.json({ message: "Хүсэлт зөвшөөрөгдлөө" });
  } catch (err) {
    next(err);
  }
};

exports.declineTeamInvite = async (req, res, next) => {
  try {
    const invite = await TeamInvite.findById(req.params.inviteId);
    if (!invite) {
      return res.status(404).json({ message: "Хүсэлт олдсонгүй" });
    }

    if (String(invite.invitedUser) !== String(req.user._id)) {
      return res.status(403).json({ message: "No permission" });
    }

    if (invite.status !== "pending") {
      return res.status(400).json({ message: "Хүсэлтийн төлөв буруу байна" });
    }

    invite.status = "declined";
    invite.respondedAt = new Date();
    await invite.save();

    res.json({ message: "Хүсэлт татгалзлаа" });
  } catch (err) {
    next(err);
  }
};

exports.listTeamManhuas = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id).lean();
    if (!team) {
      return res.status(404).json({ message: "Team олдсонгүй" });
    }

    const role = getMemberRole(team, req.user._id);
    if (!role && !isGlobalAdmin(req)) {
      return res.status(403).json({ message: "No permission" });
    }

    const manhuas = await Manhua.find({ team: team._id })
      .populate("createdBy", "username email role")
      .sort({ createdAt: -1 })
      .lean();

    const ids = manhuas.map((m) => m._id);
    const stats = await Chapter.aggregate([
      { $match: { manhua: { $in: ids } } },
      {
        $group: {
          _id: "$manhua",
          chapterCount: { $sum: 1 },
          chapterViews: { $sum: "$views" },
        },
      },
    ]);

    const statsMap = new Map(
      stats.map((s) => [String(s._id), s])
    );

    res.json(
      manhuas.map((m) => {
        const s = statsMap.get(String(m._id));
        return {
          ...m,
          chapterCount: s?.chapterCount || 0,
          chapterViews: s?.chapterViews || 0,
        };
      })
    );
  } catch (err) {
    next(err);
  }
};
