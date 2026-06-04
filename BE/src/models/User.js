const pool = require('../db');

const User = {
  findByEmail: async (email) => {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] || null;
  },

  findById: async (id) => {
    const { rows } = await pool.query(
      'SELECT id, email, name, is_verified, created_at FROM users WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  },

  create: async ({ email, passwordHash, name }) => {
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, is_verified, created_at`,
      [email, passwordHash, name]
    );
    return rows[0];
  },

  updateUnverified: async (id, { passwordHash, name }) => {
    const { rows } = await pool.query(
      `UPDATE users
       SET password_hash = $1, name = $2, updated_at = NOW()
       WHERE id = $3 AND is_verified = false
       RETURNING id, email, name, is_verified, created_at`,
      [passwordHash, name, id]
    );
    return rows[0] || null;
  },

  markVerified: async (email) => {
    const { rows } = await pool.query(
      `UPDATE users SET is_verified = true, updated_at = NOW()
       WHERE email = $1
       RETURNING id, email, name, is_verified`,
      [email]
    );
    return rows[0] || null;
  },
};

const EmailVerification = {
  upsert: async (email, code) => {
    await pool.query('DELETE FROM email_verifications WHERE email = $1', [email]);
    const { rows } = await pool.query(
      `INSERT INTO email_verifications (email, code, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes')
       RETURNING *`,
      [email, code]
    );
    return rows[0];
  },

  find: async (email) => {
    const { rows } = await pool.query(
      `SELECT * FROM email_verifications
       WHERE email = $1 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  },

  delete: async (email) => {
    await pool.query('DELETE FROM email_verifications WHERE email = $1', [email]);
  },
};

module.exports = { User, EmailVerification };
