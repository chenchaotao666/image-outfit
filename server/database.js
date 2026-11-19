const { DatabaseSync } = require('node:sqlite');
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { ApiError } = require('./contract');

const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const secret = () => crypto.randomBytes(32).toString('hex');

function openDatabase(file) {
  if (file !== ':memory:') mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA busy_timeout = 5000;
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, identity TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      expires INTEGER NOT NULL, age_requests INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS session_expiry ON sessions(expires);
    CREATE TABLE IF NOT EXISTS reports (
      user_id TEXT NOT NULL REFERENCES users(id), id TEXT NOT NULL, created_at TEXT NOT NULL,
      content TEXT NOT NULL, PRIMARY KEY(user_id, id)
    );
    CREATE INDEX IF NOT EXISTS report_history ON reports(user_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS user_documents (
      user_id TEXT NOT NULL REFERENCES users(id), kind TEXT NOT NULL CHECK(kind IN ('wardrobe','bangda')),
      revision INTEGER NOT NULL, mutation TEXT NOT NULL, content TEXT NOT NULL,
      PRIMARY KEY(user_id, kind)
    );
  `);
  const query = sql => db.prepare(sql);
  return {
    close: () => db.close(),
    login(identity) {
      const now = Date.now();
      query('DELETE FROM sessions WHERE expires <= ?').run(now);
      db.exec('BEGIN IMMEDIATE');
      try {
        if (query('SELECT count(*) AS count FROM sessions').get().count >= 100) {
          throw new ApiError('BUSY', '服务繁忙，请稍后再试', 429);
        }
        query('INSERT INTO users VALUES (?, ?) ON CONFLICT(identity) DO NOTHING').run(crypto.randomUUID(), identity);
        const { id } = query('SELECT id FROM users WHERE identity = ?').get(identity);
        const token = secret(), expires = now + 3600000;
        query('INSERT INTO sessions(token_hash,user_id,expires) VALUES (?,?,?)').run(digest(token), id, expires);
        db.exec('COMMIT');
        return { token, userId: id, expires };
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    session(token) {
      return query('SELECT user_id AS userId, token_hash AS tokenHash FROM sessions WHERE token_hash=? AND expires>?')
        .get(digest(token), Date.now());
    },
    reserveAge(tokenHash) {
      return query('UPDATE sessions SET age_requests=age_requests+1 WHERE token_hash=? AND age_requests<10').run(tokenHash).changes === 1;
    },
    saveReport(userId, report) {
      const { photoEvidence, ...content } = report;
      query('INSERT INTO reports VALUES (?,?,?,?)').run(userId, report.id, report.createdAt, JSON.stringify(content));
    },
    listReports(userId) {
      return query(`SELECT id, created_at AS createdAt, json_extract(content,'$.date') AS date,
        json_extract(content,'$.profile') AS profile FROM reports WHERE user_id=? ORDER BY created_at DESC, id`)
        .all(userId).map(row => ({ ...row, profile: JSON.parse(row.profile), mode: 'ai', accountReport: true }));
    },
    report(userId, id) {
      const row = query('SELECT content FROM reports WHERE user_id=? AND id=?').get(userId, id);
      if (!row) throw new ApiError('NOT_FOUND', '报告不存在或已删除', 404);
      return JSON.parse(row.content);
    },
    editReport(userId, id, field, value) {
      const result = query('UPDATE reports SET content=json_set(content, ?, json(?)) WHERE user_id=? AND id=?')
        .run('$.' + field, JSON.stringify(value), userId, id);
      if (!result.changes) throw new ApiError('NOT_FOUND', '报告不存在或已删除', 404);
    },
    removeReport(userId, id) {
      query('DELETE FROM reports WHERE user_id=? AND id=?').run(userId, id);
    },
    document(userId, kind) {
      const row = query('SELECT revision,mutation,content FROM user_documents WHERE user_id=? AND kind=?').get(userId, kind);
      return row ? { revision: row.revision, mutation: row.mutation, value: JSON.parse(row.content) } : { revision: 0, value: null };
    },
    putDocument(userId, kind, { revision, mutation, value }) {
      const content = JSON.stringify(value);
      const changed = revision === 0
        ? query('INSERT INTO user_documents VALUES (?,?,1,?,?) ON CONFLICT DO NOTHING').run(userId, kind, mutation, content)
        : query('UPDATE user_documents SET revision=revision+1,mutation=?,content=? WHERE user_id=? AND kind=? AND revision=?')
            .run(mutation, content, userId, kind, revision);
      if (!changed.changes) {
        const row = query('SELECT revision,mutation FROM user_documents WHERE user_id=? AND kind=?').get(userId, kind);
        if (row?.mutation === mutation) return { revision: row.revision };
        throw new ApiError('CONFLICT', '其他设备已修改这份数据，请重新加载', 409);
      }
      return { revision: revision + 1 };
    }
  };
}
module.exports = { openDatabase, digest, secret };
