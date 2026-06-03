const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/test/hello - 서버 동작 확인
router.get('/hello', (req, res) => {
  res.json({
    success: true,
    message: 'ClotAI 백엔드 서버가 정상 동작 중입니다.',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// GET /api/test/db - DB 연결 확인
router.get('/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS current_time, current_database() AS db_name');
    res.json({
      success: true,
      message: 'PostgreSQL 연결 성공',
      data: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'PostgreSQL 연결 실패',
      error: err.message,
    });
  }
});

module.exports = router;
