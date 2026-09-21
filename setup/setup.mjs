#!/usr/bin/env node
/**
 * 미니홈피 자동 셋업 스크립트
 * 사전 조건: GitHub 계정/저장소 fork, Supabase 계정/프로젝트 생성 완료 후 실행
 * 사용법: node setup/setup.mjs [--dry-run]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const isDryRun = process.argv.includes('--dry-run');

// ── ANSI 색상 ────────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  bold:   '\x1b[1m',
};
const ok  = (m) => console.log(`${C.green}✓ ${m}${C.reset}`);
const err = (m) => console.log(`${C.red}✗ ${m}${C.reset}`);
const hdr = (m) => console.log(`\n${C.cyan}${C.bold}▶ ${m}${C.reset}`);
const dim = (m) => console.log(`${C.yellow}  ${m}${C.reset}`);

// ── readline 헬퍼 ─────────────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

/** 입력 중 문자를 '*' 로 치환해 터미널에 표시 */
function askSecret(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    const stdin = process.openStdin();
    let value = '';
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    const onData = (ch) => {
      if (ch === '\n' || ch === '\r' || ch === '\u0004') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(value);
      } else if (ch === '\u0003') {
        process.exit();
      } else if (ch === '\u007f') {
        // backspace
        if (value.length > 0) {
          value = value.slice(0, -1);
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          process.stdout.write(prompt + '*'.repeat(value.length));
        }
      } else {
        value += ch;
        process.stdout.write('*');
      }
    };
    process.stdin.on('data', onData);
  });
}

async function askContinue() {
  const a = await ask(`${C.yellow}이 단계를 건너뛰고 계속 진행하시겠습니까? (y/n): ${C.reset}`);
  if (a.toLowerCase() !== 'y') { console.log('스크립트를 중단합니다.'); rl.close(); process.exit(1); }
}

// ── API 호출 ──────────────────────────────────────────────────────────────────
async function apiFetch(url, { method = 'GET', token, body } = {}) {
  if (isDryRun) { dim(`[DRY RUN] ${method} ${url}`); return { ok: true, data: {} }; }
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

// ── 메인 ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${C.bold}${C.green}━━━ 미니홈피 셋업 스크립트 ━━━${C.reset}`);
  if (isDryRun) console.log(`${C.yellow}⚠ DRY RUN 모드: 실제 API 호출과 파일 변경 없이 흐름만 확인합니다.${C.reset}`);

  // ── Step 1: 정보 수집 ──────────────────────────────────────────────────────
  hdr('Step 1 / 7  —  설정 정보 입력');
  console.log('  (토큰/비밀번호는 입력 중 화면에 표시되지 않습니다)\n');

  const github = {
    username: (await ask('  GitHub Username: ')).trim(),
    repo:     (await ask('  GitHub 저장소 이름 (fork한 repo): ')).trim(),
    pat:      await askSecret('  GitHub Personal Access Token: '),
  };

  const sb = {
    url:     (await ask('  Supabase Project URL (https://xxxx.supabase.co): ')).trim().replace(/\/$/, ''),
    anonKey: await askSecret('  Supabase anon/publishable key: '),
    ref:     (await ask('  Supabase Project Ref (예: itkymmxnbjylyzbmdxdb): ')).trim(),
    token:   await askSecret('  Supabase Management API Access Token: '),
  };

  const admin = {
    email:    (await ask('  관리자 이메일: ')).trim(),
    password: await askSecret('  관리자 비밀번호: '),
  };

  const displayName = (await ask('  미니홈피 표시 이름 (한글 가능): ')).trim();

  const centralEnabled = (await ask('  중앙 연동을 사용하시겠습니까? (y/n): ')).toLowerCase() === 'y';
  let central = { enabled: false, siteId: '', apiUrl: '', pageUrl: '' };
  if (centralEnabled) {
    central.apiUrl  = (await ask('  중앙 API URL: ')).trim().replace(/\/$/, '');
    central.pageUrl = (await ask('  중앙 Page URL: ')).trim().replace(/\/$/, '');
    central.siteId  = (await ask("  Site ID ('auto' 입력 시 자동 발급): ")).trim();
    central.enabled = true;
  }

  // ── Step 2: SQL 마이그레이션 ───────────────────────────────────────────────
  hdr('Step 2 / 7  —  Supabase 마이그레이션 적용');
  const migrDir = path.join(rootDir, 'supabase', 'migrations');
  const sqlFiles = fs.readdirSync(migrDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of sqlFiles) {
    process.stdout.write(`  ${file} ... `);
    const sql = fs.readFileSync(path.join(migrDir, file), 'utf8');
    const r = await apiFetch(
      `https://api.supabase.com/v1/projects/${sb.ref}/database/query`,
      { method: 'POST', token: sb.token, body: { query: sql } }
    );
    if (r.ok) {
      process.stdout.write(`${C.green}완료${C.reset}\n`);
    } else {
      process.stdout.write(`${C.yellow}경고 (${r.status})${C.reset}\n`);
      dim(`  → ${JSON.stringify(r.data).slice(0, 120)}`);
      dim('  이미 적용된 마이그레이션일 수 있습니다. 계속합니다.');
    }
  }
  ok('마이그레이션 단계 완료');

  // ── Step 3: 관리자 계정 생성 ───────────────────────────────────────────────
  hdr('Step 3 / 7  —  관리자 계정 생성');
  let adminUuid = 'dry-run-uuid-0000-0000-0000-000000000000';

  const createRes = await apiFetch(
    `https://api.supabase.com/v1/projects/${sb.ref}/auth/users`,
    { method: 'POST', token: sb.token, body: { email: admin.email, password: admin.password, email_confirm: true } }
  );
  if (createRes.ok && createRes.data?.id) {
    adminUuid = createRes.data.id;
    ok(`관리자 계정 생성 완료 (UUID: ${adminUuid})`);
  } else {
    err(`관리자 계정 생성 실패: ${JSON.stringify(createRes.data).slice(0, 120)}`);
    dim('이미 존재하는 이메일이거나 API 오류일 수 있습니다.');
    dim('이 경우 Supabase 대시보드 Authentication → Users에서 UUID를 직접 확인하세요.');
    adminUuid = (await ask('  관리자 UUID를 직접 입력하세요 (건너뛰려면 Enter): ')).trim() || adminUuid;
    await askContinue();
  }

  // ── Step 4: 관리자 UUID DB 등록 ────────────────────────────────────────────
  hdr('Step 4 / 7  —  관리자 권한 DB 등록');
  const insertRes = await apiFetch(
    `https://api.supabase.com/v1/projects/${sb.ref}/database/query`,
    { method: 'POST', token: sb.token,
      body: { query: `INSERT INTO private.minihompy_admins (user_id) VALUES ('${adminUuid}') ON CONFLICT DO NOTHING;` } }
  );
  if (insertRes.ok) { ok('관리자 UUID 등록 완료'); }
  else {
    err(`등록 실패: ${JSON.stringify(insertRes.data).slice(0, 120)}`);
    await askContinue();
  }

  // ── Step 5: 익명 인증 활성화 ───────────────────────────────────────────────
  hdr('Step 5 / 7  —  익명 인증 활성화');
  const anonRes = await apiFetch(
    `https://api.supabase.com/v1/projects/${sb.ref}/config/auth`,
    { method: 'PATCH', token: sb.token, body: { external_anonymous_users_enabled: true } }
  );
  if (anonRes.ok) { ok('익명 인증 활성화 완료'); }
  else {
    err(`활성화 실패: ${JSON.stringify(anonRes.data).slice(0, 120)}`);
    dim('Supabase 대시보드 Authentication → Providers → Anonymous Sign-ins 에서 수동으로 켜주세요.');
    await askContinue();
  }

  // ── Step 6a: 중앙 siteId 자동 발급 (optional) ─────────────────────────────
  if (central.enabled && central.siteId.toLowerCase() === 'auto') {
    hdr('Step 6a / 7  —  중앙 허브 siteId 발급');
    const regRes = await apiFetch(`${central.apiUrl}/sites`, {
      method: 'POST',
      token: '',   // 중앙 API 인증 방식은 추후 확정; 현재는 public endpoint 가정
      body: {
        origin: `https://${github.username}.github.io`,
        base_path: `/${github.repo}/`,
        homepage_url: `https://${github.username}.github.io/${github.repo}/`,
        login_url: `https://${github.username}.github.io/${github.repo}/?login_intent=`,
      },
    });
    if (regRes.ok && regRes.data?.site_id) {
      central.siteId = regRes.data.site_id;
      ok(`siteId 발급 완료: ${central.siteId}`);
    } else {
      err('siteId 자동 발급 실패. 중앙 허브가 아직 운영 중이 아닐 수 있습니다.');
      central.siteId = (await ask('  siteId를 직접 입력하거나 Enter로 건너뛰기: ')).trim();
      if (!central.siteId) { central.enabled = false; dim('중앙 연동을 비활성화합니다.'); }
    }
  }

  // ── Step 6b: 설정 파일 생성 ────────────────────────────────────────────────
  hdr('Step 6 / 7  —  설정 파일 생성');

  // supabase-config.js — 실제 런타임 포맷 유지
  const supabaseConfigJs = `// Public browser connection settings. Never put secret/service_role keys here.
window.MINIHOMPY_SUPABASE = Object.freeze({
  url: '${sb.url}',
  publishableKey: '${sb.anonKey}',
});
`;

  // visitor-identity-config.js — 실제 런타임 포맷 유지
  const visitorConfigJs = central.enabled
    ? `(() => {
  'use strict';

  // 중앙 공통 방문자 식별 설정 (Distributed Minihompy Shared Visitor Identity Config)
  window.MINIHOMPY_VISITOR_IDENTITY_CONFIG = Object.freeze({
    enabled: true,

    // 중앙 식별 허브에 등록된 이 미니홈피의 고유 UUID
    siteId: '${central.siteId}',

    // 중앙 식별 서비스 기본 URL
    centralApiUrl: '${central.apiUrl}',
    centralPageUrl: '${central.pageUrl}',

    // 중앙 상태 확인(/health) 타임아웃 제한 (스펙 권장: 1.5초)
    healthTimeoutMs: 1500,

    // 리다이렉트 가드 만료 시간 (2분 = 120,000ms)
    guardTimeoutMs: 120000,
  });
})();
`
    : `(() => {
  'use strict';

  // 중앙 공통 방문자 식별 설정 — 단독 운영 모드 (중앙 연동 비활성)
  window.MINIHOMPY_VISITOR_IDENTITY_CONFIG = Object.freeze({
    enabled: false,
    siteId: '',
    centralApiUrl: '',
    centralPageUrl: '',
    healthTimeoutMs: 1500,
    guardTimeoutMs: 120000,
  });
})();
`;

  if (!isDryRun) {
    fs.writeFileSync(path.join(rootDir, 'supabase-config.js'), supabaseConfigJs);
    ok('supabase-config.js 작성 완료');
    fs.writeFileSync(path.join(rootDir, 'visitor-identity-config.js'), visitorConfigJs);
    ok('visitor-identity-config.js 작성 완료');
  } else {
    dim('[DRY RUN] supabase-config.js, visitor-identity-config.js 작성 건너뜀');
  }

  // ── Step 7: Git commit & push ─────────────────────────────────────────────
  hdr('Step 7 / 7  —  Git commit & push');
  if (!isDryRun) {
    try {
      const remote = `https://${github.username}:${github.pat}@github.com/${github.username}/${github.repo}.git`;
      execSync('git add supabase-config.js visitor-identity-config.js', { cwd: rootDir, stdio: 'pipe' });
      execSync('git commit -m "Setup: configure Supabase connection and identity settings"', { cwd: rootDir, stdio: 'pipe' });
      execSync(`git remote set-url origin "${remote}"`, { cwd: rootDir, stdio: 'pipe' });
      execSync('git push origin main', { cwd: rootDir, stdio: 'inherit' });
      // 보안: remote URL을 PAT 없는 버전으로 복원
      execSync(`git remote set-url origin "https://github.com/${github.username}/${github.repo}.git"`, { cwd: rootDir, stdio: 'pipe' });
      ok('Git push 완료 및 remote URL 복원');
    } catch (e) {
      err(`Git 명령 실패: ${e.message}`);
      dim('supabase-config.js 와 visitor-identity-config.js 를 직접 commit & push 해주세요.');
    }
  } else {
    dim('[DRY RUN] git commit & push 건너뜀');
  }

  // ── 완료 요약 ──────────────────────────────────────────────────────────────
  console.log(`\n${C.bold}${C.green}━━━ 셋업 완료 ━━━${C.reset}`);
  console.log(`🌐  미니홈피 URL  : https://${github.username}.github.io/${github.repo}/`);
  console.log(`    (GitHub Actions 배포 완료까지 약 1~3분 소요)`);
  console.log(`🔑  관리자 이메일 : ${admin.email}`);
  console.log(`🔒  관리자 비밀번호: 입력하신 비밀번호를 사용하세요`);
  if (central.enabled) {
    console.log(`🔗  중앙 연동     : 활성 (siteId: ${central.siteId})`);
  } else {
    console.log(`🔗  중앙 연동     : 비활성 (단독 운영 모드)`);
  }
  console.log(`\n${C.yellow}  ⚠ GitHub Pages Actions 탭에서 배포 상태를 확인하세요.${C.reset}`);
  console.log(`     https://github.com/${github.username}/${github.repo}/actions\n`);

  rl.close();
}

main().catch((e) => {
  console.error(`\n${C.red}치명적 오류: ${e.message}${C.reset}`);
  rl.close();
  process.exit(1);
});
