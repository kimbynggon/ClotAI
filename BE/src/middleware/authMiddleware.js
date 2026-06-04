const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
  }

  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch (err) {
    logger.warn('Auth', `토큰 검증 실패: ${err.message}`);
    res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다.' });
  }
}

module.exports = { authRequired };
