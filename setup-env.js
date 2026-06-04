#!/usr/bin/env node
/**
 * ClotAI 통합 환경 변수 분리 스크립트
 *
 * 사용법:
 *   1. .env.example 을 .env 로 복사
 *   2. .env 파일에서 실제 값 채우기
 *   3. node setup-env.js 실행
 *
 * 결과:
 *   BE/.env        ← BE_* 접두사 제거 후 저장
 *   FE/.env.local  ← FE_* 접두사 제거 후 저장
 *   AI/.env        ← AI_* 접두사 제거 후 저장
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const ENV_FILE = path.join(ROOT, '.env');

if (!fs.existsSync(ENV_FILE)) {
  console.error('[setup-env] .env 파일이 없습니다. .env.example 을 복사해서 값을 채워주세요.');
  console.error('  cp .env.example .env');
  process.exit(1);
}

const raw = fs.readFileSync(ENV_FILE, 'utf8');

// prefix별 출력 파일 매핑
const TARGETS = [
  { prefix: 'BE_',  dest: path.join(ROOT, 'BE', '.env'),        label: 'BE/.env' },
  { prefix: 'FE_',  dest: path.join(ROOT, 'FE', '.env.local'),  label: 'FE/.env.local' },
  { prefix: 'AI_',  dest: path.join(ROOT, 'AI', '.env'),        label: 'AI/.env' },
];

for (const { prefix, dest, label } of TARGETS) {
  const lines = [];

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();

    // 빈 줄 / 주석 헤더 유지
    if (trimmed === '' || trimmed.startsWith('#')) {
      lines.push(line);
      continue;
    }

    // prefix 매칭 변수만 추출 후 prefix 제거
    if (trimmed.startsWith(prefix)) {
      lines.push(line.replace(prefix, ''));
    }
    // 다른 prefix 변수는 제외
  }

  // 연속된 빈 줄 압축
  const output = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, output, 'utf8');
  console.log(`[setup-env] ${label} 생성 완료`);
}

console.log('[setup-env] 완료! 각 서비스를 재시작해주세요.');
