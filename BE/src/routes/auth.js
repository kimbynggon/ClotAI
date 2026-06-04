const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, EmailVerification } = require('../models/User');
const { authRequired } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

const router = express.Router();

const EMAIL_VERIFICATION = process.env.EMAIL_VERIFICATION_ENABLED === 'true';
const SALT_ROUNDS = 10;

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function signToken(userId) {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ── POST /api/auth/signup ────────────────────────────────────────
router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ success: false, message: '모든 필드를 입력해주세요.' });
  }

  try {
    const existing = await User.findByEmail(email);
    if (existing?.is_verified) {
      return res.status(409).json({ success: false, message: '이미 사용 중인 이메일입니다.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    let user;
    if (existing) {
      // 미인증 상태로 재가입 시도: 정보 갱신 + 코드 재발송
      user = await User.updateUnverified(existing.id, { passwordHash, name });
    } else {
      user = await User.create({ email, passwordHash, name });
    }

    if (EMAIL_VERIFICATION) {
      const code = generateCode();
      await EmailVerification.upsert(email, code);
      // TODO: 실제 SMTP 연동 시 아래 주석 해제하고 logger.info 제거
      // await sendVerificationEmail(email, code);
      logger.info('Auth', `[인증 코드] ${email} → ${code}`);
      return res.json({ success: true, message: '인증 코드가 발송되었습니다.' });
    }

    // 이메일 인증 비활성화: 바로 가입 완료
    await User.markVerified(email);
    const token = signToken(user.id);
    logger.info('Auth', `회원가입 완료: ${email}`);
    res.status(201).json({ success: true, user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (err) {
    logger.error('Auth', `signup 오류: ${err.message}`);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: '이메일과 비밀번호를 입력해주세요.' });
  }

  try {
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    if (EMAIL_VERIFICATION && !user.is_verified) {
      return res.status(403).json({ success: false, message: '이메일 인증이 필요합니다.' });
    }

    const token = signToken(user.id);
    const safeUser = { id: user.id, email: user.email, name: user.name, is_verified: user.is_verified };
    logger.info('Auth', `로그인: ${email}`);
    res.json({ success: true, user: safeUser, token });
  } catch (err) {
    logger.error('Auth', `login 오류: ${err.message}`);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// ── POST /api/auth/logout ────────────────────────────────────────
router.post('/logout', (req, res) => {
  // JWT는 stateless — 클라이언트에서 토큰 삭제로 처리
  res.json({ success: true, message: '로그아웃 완료' });
});

// ── POST /api/auth/email/send ────────────────────────────────────
router.post('/email/send', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: '이메일을 입력해주세요.' });
  }

  try {
    const code = generateCode();
    await EmailVerification.upsert(email, code);
    // TODO: 실제 SMTP 연동 시 아래 주석 해제하고 logger.info 제거
    // await sendVerificationEmail(email, code);
    logger.info('Auth', `[인증 코드 재발송] ${email} → ${code}`);
    res.json({ success: true, message: '인증 코드가 발송되었습니다.' });
  } catch (err) {
    logger.error('Auth', `email/send 오류: ${err.message}`);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// ── POST /api/auth/email/verify ──────────────────────────────────
router.post('/email/verify', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ success: false, message: '이메일과 인증 코드를 입력해주세요.' });
  }

  try {
    const record = await EmailVerification.find(email);
    if (!record) {
      return res.status(410).json({ success: false, message: '인증 세션이 만료되었습니다. 다시 시도해주세요.' });
    }
    if (record.code !== String(code)) {
      return res.status(400).json({ success: false, message: '인증 코드가 올바르지 않습니다.' });
    }

    await EmailVerification.delete(email);
    const verifiedUser = await User.markVerified(email);
    if (!verifiedUser) {
      return res.status(404).json({ success: false, message: '사용자 정보를 찾을 수 없습니다.' });
    }

    const token = signToken(verifiedUser.id);
    logger.info('Auth', `이메일 인증 완료: ${email}`);
    res.json({ success: true, user: verifiedUser, token });
  } catch (err) {
    logger.error('Auth', `email/verify 오류: ${err.message}`);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────
router.get('/me', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    res.json({ success: true, user });
  } catch (err) {
    logger.error('Auth', `me 오류: ${err.message}`);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
