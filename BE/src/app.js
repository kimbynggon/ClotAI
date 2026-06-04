const express = require('express');
const cors = require('cors');
require('dotenv').config();

const routes = require('./routes');
const logger = require('./utils/logger');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 요청 로깅 미들웨어
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('HTTP', `${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

app.use('/api', routes);

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({ success: false, message: '요청한 API를 찾을 수 없습니다.' });
});

// 글로벌 에러 핸들러
app.use((err, req, res, next) => {
  logger.error('Server', err.message);
  res.status(500).json({ success: false, message: '서버 내부 오류', error: err.message });
});

module.exports = app;
