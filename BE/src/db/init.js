const pool = require('./index');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════════════
//  DB 초기화 설정
//
//  사용 방법
//  ─ autoInit: false  → 전체 비활성화 (운영 배포 시 권장)
//  ─ enabled: false   → 해당 테이블만 건너뜀 (주석 처리와 동일 효과)
//
//  마이그레이션
//  ─ migrations 배열에 { id, enabled, sql } 추가 후 서버 재시작
//  ─ 적용 완료된 항목은 enabled: false 로 변경하거나 주석 처리
// ═══════════════════════════════════════════════════════════════════════

const INIT_CONFIG = {
  // ── 마스터 스위치 ─────────────────────────────────────────────────
  autoInit: true,  // false: 서버 시작 시 DB 초기화 완전 비활성화

  // ── 테이블 ────────────────────────────────────────────────────────
  tables: [
    {
      name: 'users',
      enabled: true,
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id            SERIAL       PRIMARY KEY,
          email         VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          name          VARCHAR(50)  NOT NULL,
          is_verified   BOOLEAN      DEFAULT false,
          created_at    TIMESTAMPTZ  DEFAULT NOW(),
          updated_at    TIMESTAMPTZ  DEFAULT NOW()
        );
      `,
    },
    {
      name: 'email_verifications',
      enabled: true,
      sql: `
        CREATE TABLE IF NOT EXISTS email_verifications (
          id         SERIAL       PRIMARY KEY,
          email      VARCHAR(255) NOT NULL,
          code       VARCHAR(6)   NOT NULL,
          expires_at TIMESTAMPTZ  NOT NULL,
          created_at TIMESTAMPTZ  DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_ev_email ON email_verifications (email);
      `,
    },

    // ── 추후 추가 예정 테이블 (enabled: true 로 변경하여 활성화) ────
    // {
    //   name: 'profiles',
    //   enabled: false,
    //   sql: `
    //     CREATE TABLE IF NOT EXISTS profiles (
    //       id           SERIAL  PRIMARY KEY,
    //       user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    //       gender       VARCHAR(10),
    //       birth_year   INTEGER,
    //       height       NUMERIC(5,1),
    //       weight       NUMERIC(5,1),
    //       body_type    VARCHAR(30),
    //       style_tags   TEXT[],
    //       color_tags   TEXT[],
    //       budget_tier  VARCHAR(20),
    //       updated_at   TIMESTAMPTZ DEFAULT NOW()
    //     );
    //   `,
    // },
    // {
    //   name: 'outfits',
    //   enabled: false,
    //   sql: `
    //     CREATE TABLE IF NOT EXISTS outfits (
    //       id         SERIAL  PRIMARY KEY,
    //       user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
    //       ai_result  JSONB,
    //       weather    JSONB,
    //       created_at TIMESTAMPTZ DEFAULT NOW()
    //     );
    //   `,
    // },
    // {
    //   name: 'ai_sessions',
    //   enabled: false,
    //   sql: `
    //     CREATE TABLE IF NOT EXISTS ai_sessions (
    //       id         SERIAL  PRIMARY KEY,
    //       user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
    //       input      JSONB,
    //       output     JSONB,
    //       created_at TIMESTAMPTZ DEFAULT NOW()
    //     );
    //   `,
    // },
  ],

  // ── 마이그레이션 (ALTER TABLE 등 1회성 DDL) ──────────────────────
  // 실행 후 enabled: false 로 변경하거나 주석 처리 권장
  migrations: [
    // 예시:
    // {
    //   id: '2026-06-04_add_profile_image',
    //   enabled: false,
    //   sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT;`,
    // },
  ],
};

async function initDB() {
  if (!INIT_CONFIG.autoInit) {
    logger.info('DB', 'autoInit=false → DB 초기화 건너뜀');
    return;
  }

  logger.info('DB', 'DB 초기화 시작');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const table of INIT_CONFIG.tables) {
      if (!table.enabled) {
        logger.debug('DB', `건너뜀: ${table.name}`);
        continue;
      }
      await client.query(table.sql);
      logger.info('DB', `테이블 준비: ${table.name}`);
    }

    for (const migration of INIT_CONFIG.migrations) {
      if (!migration.enabled) continue;
      await client.query(migration.sql);
      logger.info('DB', `마이그레이션 적용: ${migration.id}`);
    }

    await client.query('COMMIT');
    logger.info('DB', 'DB 초기화 완료');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('DB', `DB 초기화 실패: ${err.message}`);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { initDB, INIT_CONFIG };
