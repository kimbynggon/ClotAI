const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../../log');

function getLogPath() {
  return path.join(LOG_DIR, `${new Date().toISOString().slice(0, 10)}.log`);
}

function write(level, ctx, msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level.padEnd(5)}] [${ctx}] ${msg}\n`;
  process.stdout.write(line);
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(getLogPath(), line, 'utf8');
  } catch {
    // 로그 파일 쓰기 실패 시 콘솔만 유지
  }
}

module.exports = {
  info:  (ctx, msg) => write('INFO',  ctx, msg),
  warn:  (ctx, msg) => write('WARN',  ctx, msg),
  error: (ctx, msg) => write('ERROR', ctx, msg),
  debug: (ctx, msg) => { if (process.env.NODE_ENV !== 'production') write('DEBUG', ctx, msg); },
};
