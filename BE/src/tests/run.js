require('dotenv').config();
const http = require('http');
const pool = require('../db');

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

let passed = 0;
let failed = 0;

function log(label, ok, detail = '') {
  const mark = ok ? '✅' : '❌';
  console.log(`${mark} ${label}${detail ? ' — ' + detail : ''}`);
  ok ? passed++ : failed++;
}

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${path}`, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('\n======================================');
  console.log('  ClotAI 백엔드 테스트 시작');
  console.log('======================================\n');

  // 1. DB 직접 연결 테스트
  try {
    const res = await pool.query('SELECT 1 AS ok');
    log('DB 직접 연결', res.rows[0].ok === 1, `DB: ${process.env.DB_NAME}@${process.env.DB_HOST}`);
  } catch (err) {
    log('DB 직접 연결', false, err.message);
  }

  // 2. 서버 헬스체크 API
  try {
    const { status, data } = await httpGet('/api/test/hello');
    log('GET /api/test/hello', status === 200 && data.success === true, data.message);
  } catch (err) {
    log('GET /api/test/hello', false, '서버가 실행 중인지 확인하세요: npm run dev');
  }

  // 3. DB 연결 API 테스트
  try {
    const { status, data } = await httpGet('/api/test/db');
    log('GET /api/test/db', status === 200 && data.success === true, data.message);
  } catch (err) {
    log('GET /api/test/db', false, err.message);
  }

  // 4. 없는 경로 404 테스트
  try {
    const { status } = await httpGet('/api/not-exist');
    log('404 핸들러', status === 404, `status: ${status}`);
  } catch (err) {
    log('404 핸들러', false, err.message);
  }

  console.log('\n======================================');
  console.log(`  결과: 통과 ${passed} / 실패 ${failed}`);
  console.log('======================================\n');

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
