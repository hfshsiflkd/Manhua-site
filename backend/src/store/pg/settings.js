"use strict";

const { query, asId, newId } = require("./helpers");

const AppSetting = {
  findOne(filter) {
    const q = {
      lean() {
        return q.exec();
      },
      then(resolve, reject) {
        return q.exec().then(resolve, reject);
      },
      async exec() {
        const r = await query(`SELECT * FROM arc.app_settings WHERE key=$1 LIMIT 1`, [filter.key]);
        if (!r.rows[0]) return null;
        return { _id: r.rows[0].id, key: r.rows[0].key, value: r.rows[0].value };
      },
    };
    return q;
  },
  async create(input) {
    return AppSetting.findOneAndUpdate({ key: input.key }, { value: input.value }, { upsert: true });
  },
  async findOneAndUpdate(filter, update, opts = {}) {
    const value = update.value !== undefined ? update.value : update.$set?.value;
    const existing = await query(`SELECT id FROM arc.app_settings WHERE key=$1`, [filter.key]);
    if (existing.rows[0]) {
      await query(
        `UPDATE arc.app_settings SET value=$2::jsonb, updated_at=now() WHERE key=$1`,
        [filter.key, JSON.stringify(value ?? null)]
      );
      return { key: filter.key, value };
    }
    if (opts.upsert) {
      const id = newId();
      await query(
        `INSERT INTO arc.app_settings (id, key, value, extra, created_at, updated_at)
         VALUES ($1,$2,$3::jsonb,'{}'::jsonb,now(),now())`,
        [id, filter.key, JSON.stringify(value ?? null)]
      );
      return { _id: id, key: filter.key, value };
    }
    return null;
  },
};

const TrialDevice = {
  findOne(filter) {
    const q = {
      then(resolve, reject) {
        return q.exec().then(resolve, reject);
      },
      async exec() {
        const r = await query(`SELECT * FROM arc.trial_devices WHERE device_id=$1 LIMIT 1`, [
          filter.deviceId,
        ]);
        return r.rows[0]
          ? { _id: r.rows[0].id, deviceId: r.rows[0].device_id, firstUserId: r.rows[0].first_user_id }
          : null;
      },
    };
    return q;
  },
  async create(input) {
    const id = newId();
    await query(
      `INSERT INTO arc.trial_devices (id, device_id, first_user_id, first_granted_at, ip, extra, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,'{}'::jsonb,now(),now())
       ON CONFLICT (device_id) DO NOTHING`,
      [id, input.deviceId, asId(input.firstUserId), input.firstGrantedAt || new Date(), input.ip || ""]
    );
    return { _id: id, ...input };
  },
};

module.exports = { AppSetting, TrialDevice };
