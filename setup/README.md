# 미니홈피 자동 셋업 스크립트

> **Node.js 18 이상** 필요 (built-in fetch 사용)

이 스크립트는 미니홈피 프로젝트의 초기 설정을 자동화합니다. 
GitHub 리포지토리와 Supabase 프로젝트가 준비된 후 실행하여 데이터베이스 설정 및 환경변수 설정을 쉽게 완료할 수 있습니다.

## Prerequisites (사전 준비사항)

스크립트를 실행하기 전에 다음 항목들이 준비되어 있어야 합니다:
1. GitHub 계정 및 Personal Access Token (PAT)
2. `henry-phd-finance/minihompy`에서 Fork 한 본인 소유의 GitHub Repository
3. Supabase 계정 및 Project 생성
4. Supabase Management API Access Token
5. Supabase Project URL 및 Publishable(Anon) Key
6. Supabase Project Ref (URL의 서브도메인, 예: `itkymmxnbjylyzbmdxdb`)

## How to run (실행 방법)

터미널에서 미니홈피 프로젝트의 루트 디렉토리로 이동한 후 아래 명령어를 실행합니다.

```bash
node setup/setup.mjs
```

> **Dry-run 모드**: 실제 API 호출이나 파일 변경 없이 실행 과정을 확인하고 싶다면 `--dry-run` 플래그를 추가하세요.
> ```bash
> node setup/setup.mjs --dry-run
> ```

## What each step does (수행 단계)

1. **설정 정보 입력**: 필요한 모든 키와 토큰을 터미널에서 대화형으로 입력받습니다. (비밀번호 및 토큰은 화면에 노출되지 않도록 마스킹됩니다.)
2. **Supabase 마이그레이션 적용**: `supabase/migrations/` 폴더에 있는 SQL 파일들을 순차적으로 Supabase 데이터베이스에 적용합니다.
3. **Admin User 생성**: 입력한 이메일과 비밀번호로 관리자(Admin) 계정을 생성합니다.
4. **Admin 권한 부여**: 생성된 관리자의 UUID를 데이터베이스의 `private.minihompy_admins` 테이블에 삽입하여 권한을 부여합니다.
5. **익명 인증 활성화**: 미니홈피 방문자들을 위한 익명 로그인(Anonymous Auth) 기능을 Supabase에 활성화합니다.
6. **로컬 설정 파일 업데이트**: 입력받은 정보를 바탕으로 `supabase-config.js`와 `visitor-identity-config.js` 파일을 갱신합니다.
7. **Git Commit & Push**: 변경된 설정 파일을 커밋하고, GitHub PAT를 사용하여 본인의 Repository에 자동으로 푸시합니다.
8. **완료 요약 출력**: 접속 가능한 GitHub Pages URL과 로그인 정보 등을 요약하여 보여줍니다.

## Troubleshooting (문제 해결)

### 토큰 발급 경로

| 토큰 | 발급 경로 |
|------|-----------|
| **GitHub PAT** | github.com → 우측 상단 프로필 → Settings → Developer settings → Personal access tokens → Fine-grained tokens |
| **Supabase Management API Token** | supabase.com → 우측 상단 프로필 → Account → Access Tokens → Generate new token |
| **Supabase anon key** | Supabase 대시보드 → 해당 프로젝트 → Settings → API → `anon` `public` 값 |
| **Supabase Project Ref** | Supabase 대시보드 → 해당 프로젝트 → Settings → General → Reference ID |

### 오류별 대처

- **마이그레이션 경고(200이 아닌 응답)**: 이미 해당 테이블/함수가 존재하는 경우입니다. `y`를 눌러 계속 진행하세요.
- **관리자 계정 생성 실패**: 이메일이 이미 등록되어 있을 수 있습니다. Supabase 대시보드 Authentication → Users 에서 기존 UUID를 복사해 스크립트에 직접 입력하세요.
- **익명 인증 활성화 실패**: Supabase 대시보드 Authentication → Providers → Anonymous Sign-ins 를 수동으로 켜주세요.
- **Git 푸시 실패**: PAT 권한(Contents: Read & Write)을 확인하고, 로컬에서 `git push origin main`을 수동 실행하세요.
- **Node.js 버전 오류**: `node --version`이 18 미만이면 [nodejs.org](https://nodejs.org)에서 LTS 버전을 설치하세요.
