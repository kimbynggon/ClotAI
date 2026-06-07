require('dotenv').config();
const app = require('./app');
const { initDB } = require('./db/init');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

async function start() {
  await initDB();
  app.listen(PORT, () => {
    logger.info('Server', `ClotAI 백엔드 실행 중 → http://localhost:${PORT}`);
    logger.info('Server', `환경: ${process.env.NODE_ENV}`);
  });
}

start().catch((err) => {
  logger.error('Server', `시작 실패: ${err.message}`);
  process.exit(1);
});
