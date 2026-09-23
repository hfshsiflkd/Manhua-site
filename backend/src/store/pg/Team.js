"use strict";

const { query, asId, asIdList, newId, wrapPg, pick } = require("./helpers");

function rowToTeam(row, members = []) {
  if (!row) return null;
  return {
    _id: row.id,
    name: row.name,
    description: row.description,
    createdBy: row.created_username
      ? {
          _id: row.created_by,
          username: row.created_username,
          avatar: row.created_avatar,
          role: row.created_role,
        }
      : row.created_by,
    members,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadMembers(teamId) {
  const r = await query(
    `SELECT m.user_id, m.role, m.added_by, m.added_at,
            u.username, u.avatar, u.role AS user_role
       FROM arc.team_members m
       JOIN arc.users u ON u.id = m.user_id
      WHERE m.team_id=$1
      ORDER BY m.added_at NULLS LAST, m.user_id`,
    [teamId]
  );
  return r.rows.map((row) => ({
    user: {
      _id: row.user_id,
      username: row.username,
      avatar: row.avatar,
      role: row.user_role,
    },
    role: row.role,
    addedBy: row.added_by,
    addedAt: row.added_at,
  }));
}

async function replaceMembers(teamId, members) {
  await query("DELETE FROM arc.team_members WHERE team_id=$1", [teamId]);
  for (const member of members || []) {
    const userId = asId(member.user?._id || member.user);
    if (!userId) continue;
    await query(
      `INSERT INTO arc.team_members (team_id, user_id, role, added_by, added_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (team_id, user_id) DO UPDATE SET role=EXCLUDED.role`,
      [teamId, userId, member.role || "editor", member.addedBy ? asId(member.addedBy) : null, member.addedAt || new Date()]
    );
  }
}

function wrapTeam(doc) {
  if (!doc) return null;
  doc.save = async function save() {
    await query(
      `UPDATE arc.teams SET name=$2, description=$3, updated_at=now() WHERE id=$1`,
      [asId(doc._id), doc.name, doc.description || ""]
    );
    await replaceMembers(asId(doc._id), doc.members);
    return doc;
  };
  return doc;
}

class TeamQuery {
  constructor(filter = {}, { one = false } = {}) {
    this.filter = filter;
    this.one = one;
    this._select = null;
    this._lean = false;
    this._sort = null;
    this._populate = [];
  }
  select(spec) {
    this._select = spec;
    return this;
  }
  lean() {
    this._lean = true;
    return this;
  }
  sort(spec) {
    this._sort = spec;
    return this;
  }
  populate(spec) {
    this._populate.push(spec);
    return this;
  }
  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
  async exec() {
    const params = [];
    const clauses = [];
    if (this.filter._id?.$in) {
      params.push(asIdList(this.filter._id.$in));
      clauses.push(`t.id = ANY($${params.length})`);
    } else if (this.filter._id) {
      params.push(asId(this.filter._id));
      clauses.push(`t.id = $${params.length}`);
    }
    if (this.filter["members.user"]?.$in) {
      params.push(asIdList(this.filter["members.user"].$in));
      clauses.push(
        `EXISTS (SELECT 1 FROM arc.team_members m WHERE m.team_id=t.id AND m.user_id = ANY($${params.length}))`
      );
    } else if (this.filter["members.user"]) {
      params.push(asId(this.filter["members.user"]));
      clauses.push(
        `EXISTS (SELECT 1 FROM arc.team_members m WHERE m.team_id=t.id AND m.user_id=$${params.length})`
      );
    }
    let sql = `SELECT t.*, u.username AS created_username, u.avatar AS created_avatar, u.role AS created_role
       FROM arc.teams t
       LEFT JOIN arc.users u ON u.id = t.created_by
      WHERE ${clauses.length ? clauses.join(" AND ") : "true"}`;
    if (this._sort?.name) sql += ` ORDER BY t.name ${this._sort.name === -1 ? "DESC" : "ASC"}`;
    else sql += " ORDER BY t.created_at DESC";
    if (this.one) sql += " LIMIT 1";
    const r = await query(sql, params);
    const rows = [];
    for (const row of r.rows) {
      const members = await loadMembers(row.id);
      rows.push(wrapTeam(pick(rowToTeam(row, members), this._select)));
    }
    return this.one ? rows[0] || null : rows;
  }
}

const Team = {
  find(filter) {
    return new TeamQuery(filter);
  },
  findOne(filter) {
    return new TeamQuery(filter, { one: true });
  },
  findById(id) {
    return new TeamQuery({ _id: id }, { one: true });
  },
  async create(input) {
    const id = newId();
    await query(
      `INSERT INTO arc.teams (id, name, description, created_by, extra, created_at, updated_at)
       VALUES ($1,$2,$3,$4,'{}'::jsonb,now(),now())`,
      [id, input.name, input.description || "", asId(input.createdBy)]
    );
    await replaceMembers(id, input.members || []);
    return Team.findById(id);
  },
  async deleteOne(filter) {
    const r = await query("DELETE FROM arc.teams WHERE id=$1", [asId(filter._id)]);
    return { deletedCount: r.rowCount };
  },
};

function rowToInvite(row) {
  if (!row) return null;
  return {
    _id: row.id,
    team: row.team_doc || row.team_id,
    invitedUser: row.invited_user_id,
    invitedBy: row.invited_by_id,
    role: row.role,
    status: row.status,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function wrapInvite(doc) {
  if (!doc) return null;
  doc.save = async function save() {
    await query(
      `UPDATE arc.team_invites SET status=$2, responded_at=$3, role=$4, updated_at=now() WHERE id=$1`,
      [asId(doc._id), doc.status, doc.respondedAt || null, doc.role]
    );
    return doc;
  };
  return doc;
}

class InviteQuery {
  constructor(filter = {}, { one = false } = {}) {
    this.filter = filter;
    this.one = one;
    this._lean = false;
    this._populate = [];
  }
  lean() {
    this._lean = true;
    return this;
  }
  sort() {
    return this;
  }
  populate(spec) {
    this._populate.push(spec);
    return this;
  }
  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
  async exec() {
    const params = [];
    const clauses = [];
    if (this.filter._id) {
      params.push(asId(this.filter._id));
      clauses.push(`i.id=$${params.length}`);
    }
    if (this.filter.team) {
      params.push(asId(this.filter.team));
      clauses.push(`i.team_id=$${params.length}`);
    }
    if (this.filter.invitedUser) {
      params.push(asId(this.filter.invitedUser));
      clauses.push(`i.invited_user_id=$${params.length}`);
    }
    if (this.filter.status) {
      params.push(this.filter.status);
      clauses.push(`i.status=$${params.length}`);
    }
    const r = await query(
      `SELECT i.* FROM arc.team_invites i WHERE ${clauses.length ? clauses.join(" AND ") : "true"} ORDER BY i.created_at DESC`,
      params
    );
    const rows = r.rows.map((row) => wrapInvite(rowToInvite(row)));
    return this.one ? rows[0] || null : rows;
  }
}

const TeamInvite = {
  find(filter) {
    return new InviteQuery(filter);
  },
  findOne(filter) {
    return new InviteQuery(filter, { one: true });
  },
  findById(id) {
    return new InviteQuery({ _id: id }, { one: true });
  },
  async create(input) {
    const id = newId();
    try {
      await query(
        `INSERT INTO arc.team_invites (
          id, team_id, invited_user_id, invited_by_id, role, status, extra, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,'{}'::jsonb,now(),now())`,
        [
          id,
          asId(input.team),
          asId(input.invitedUser),
          asId(input.invitedBy),
          input.role || "editor",
          input.status || "pending",
        ]
      );
    } catch (err) {
      wrapPg(err);
    }
    return TeamInvite.findById(id);
  },
};

module.exports = { Team, TeamInvite };
