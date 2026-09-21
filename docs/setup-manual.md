# 미니홈피 수동 셋업 가이드

이 가이드는 CLI 도구를 사용하지 않고 웹 브라우저(GitHub 및 Supabase 웹사이트)를 통해 직접 미니홈피를 구축하고자 하는 사용자를 위한 수동 설정 매뉴얼입니다.

**예상 소요 시간**: 약 25분 (Part A: ~5분, Part B: ~15분, Part C: ~5분)

---

## Part A: GitHub 셋업 (예상 소요 시간: 5분)

### Step 1: GitHub 계정 생성
- **URL**: [https://github.com/signup](https://github.com/signup)
- **주의사항**: 여기서 설정하는 사용자 이름(Username)이 향후 미니홈피 URL의 일부가 됩니다. (예: `username.github.io/repo-name`)

![GitHub 회원가입 화면](screenshots/01-github-signup.png)
> 💡 *화면 안내: 사용자 이름, 이메일, 비밀번호를 입력하고 이메일 인증 코드를 확인하여 계정을 생성합니다.*

---

### Step 2: 저장소 Fork (복제)
- **원본 저장소**: [https://github.com/henry-phd-finance/minihompy](https://github.com/henry-phd-finance/minihompy)
- **Fork 방법**: 위 링크로 접속 후, 우측 상단의 **'Fork'** 버튼을 클릭합니다.
- **설정**: 
  - **Repository name**: `minihompy`로 설정하는 것을 권장합니다.
  - **Public/Private**: GitHub Pages의 무료 플랜을 사용하려면 반드시 **Public**으로 설정해야 합니다.

![저장소 Fork 화면](screenshots/02-github-fork.png)
> 💡 *화면 안내: 원본 저장소 우측 상단의 Fork 버튼을 누르고, 저장소 이름을 확인한 뒤 'Create fork'를 누릅니다.*

---

### Step 3: GitHub Pages 활성화
- **설정 위치**: Fork한 본인 저장소의 상단 메뉴 중 **'Settings'** 탭 클릭 → 좌측 사이드바에서 **'Pages'** 선택.
- **Source 설정**: **'Build and deployment'** 섹션의 Source 드롭다운에서 **'GitHub Actions'**를 선택합니다.
- **참고**: 설정을 마친 후 첫 배포가 완료되기까지 수 분 정도 소요될 수 있습니다.

![GitHub Pages 설정 화면](screenshots/03-github-pages.png)
> 💡 *화면 안내: Build and deployment의 Source를 Deploy from a branch에서 'GitHub Actions'로 변경합니다.*

---

### Step 4: GitHub Personal Access Token 발급 (선택/CLI용)
- **설정 위치**: 우측 상단 프로필 아이콘 클릭 → **'Settings'** → 좌측 사이드바 최하단 **'Developer settings'** → **'Personal access tokens'** → **'Fine-grained tokens'** 클릭 후 **'Generate new token'** 버튼 클릭.
- **필요한 권한 (Repository permissions)**: 
  - **Contents**: Read and Write
  - **Pages**: Read and Write
- **주의사항**: 생성된 토큰 문자열은 생성 직후 단 한 번만 표시되므로, 안전한 곳에 복사해 둡니다.

![GitHub Fine-grained PAT 설정 화면](screenshots/04-github-pat.png)
> 💡 *화면 안내: Repository permissions에서 Contents와 Pages 권한을 'Read and write'로 설정하고 토큰을 생성합니다.*

---

## Part B: Supabase 셋업 (예상 소요 시간: 15분)

### Step 5: Supabase 계정 생성
- **URL**: [https://supabase.com](https://supabase.com)
- **가입 방법**: 우측 상단의 **'Start your project'** 버튼을 클릭하고 가입합니다. 가입 시 GitHub 계정 연동을 권장합니다.

![Supabase 가입 화면](screenshots/05-supabase-signup.png)
> 💡 *화면 안내: 'Sign up with GitHub' 버튼을 클릭하여 기존 GitHub 계정으로 간편하게 시작합니다.*

---

### Step 6: 새 프로젝트 생성 및 API 키 확인
- **프로젝트 생성**: 대시보드에서 **'New project'** 버튼을 클릭합니다.
- **설정**: 
  - **Project name**: 원하는 이름(예: `minihompy`) 입력.
  - **Database password**: 안전한 비밀번호로 설정하고 꼭 기억해 두세요.
  - **Region**: 서비스할 지역(예: Seoul `ap-northeast-2`)을 선택합니다.
- **정보 복사**: 프로젝트 준비가 완료되면 좌측 사이드바 하단의 **'Settings'** (톱니바퀴) → **'API'** 메뉴로 이동하여 다음 두 값을 복사합니다:
  - **Project URL** (예: `https://xxxxxxxx.supabase.co`)
  - **anon / public** 키 (긴 JWT 토큰 문자열)

![Supabase 프로젝트 생성 및 API 키 화면](screenshots/06-supabase-new-project.png)
> 💡 *화면 안내: Settings → API 화면에서 Project URL과 anon public 키를 복사합니다. (service_role 키는 절대 노출 금지)*

---

### Step 7: SQL 마이그레이션 실행
데이터베이스 테이블을 생성하기 위해 제공된 SQL 스크립트를 실행해야 합니다. SQL 파일들은 GitHub 저장소의 `supabase/migrations/` 폴더에서 직접 확인할 수 있습니다.
- **실행 방법**: Supabase 대시보드 좌측 메뉴에서 **'SQL Editor'**를 열고 새 쿼리를 생성합니다.
- **순서**: 다음 파일들의 내용을 찾아 순서대로 각각 붙여넣고 상단의 **'Run'** 버튼을 눌러 실행합니다.
  1. `supabase/migrations/202609130001_identity.sql`
  2. `supabase/migrations/202609130002_board.sql`
  3. `supabase/migrations/202609130003_settings.sql`
  4. `supabase/migrations/202609130004_photos.sql`
  5. `supabase/migrations/202609130005_diary.sql`
  6. `supabase/migrations/202609130006_guestbook.sql`
  7. `supabase/migrations/202609130007_guestbook_clock.sql`
  8. `supabase/migrations/202609130008_comments.sql`
  9. `supabase/migrations/202609130009_profile.sql`
  10. `supabase/migrations/202609130010_board_retry.sql`

![Supabase SQL Editor 실행 화면](screenshots/07-supabase-sql-editor.png)
> 💡 *화면 안내: 새 SQL 쿼리 탭을 열고 각 마이그레이션 파일의 SQL 내용을 붙여넣은 뒤 우측 상단 'Run' 버튼을 클릭합니다.*

---

### Step 8: 관리자 계정 생성
- **생성 위치**: Supabase 대시보드 좌측 메뉴 **'Authentication'** → 상단 **'Users'** 탭 → **'Add user'** → **'Create new user'** 선택.
- **설정**: 본인의 관리자 이메일과 비밀번호를 입력하고 계정을 생성합니다.
- **UUID 복사**: 생성된 계정 목록에서 방금 만든 사용자의 **'User UID'** 값을 클릭하여 복사합니다.

![Supabase 관리자 사용자 생성 화면](screenshots/08-supabase-create-user.png)
> 💡 *화면 안내: Add user 모달에서 Email과 Password를 입력한 뒤 Auto Confirm Users를 체크하고 계정을 만듭니다.*

---

### Step 9: 관리자 UUID 권한 등록
관리자 권한을 부여하기 위해 다시 **'SQL Editor'**로 이동하여 다음 쿼리를 실행합니다:
```sql
INSERT INTO private.minihompy_admins (user_id) VALUES ('여기에-복사한-User-UID를-붙여넣으세요');
```

![Supabase 관리자 권한 등록 쿼리 화면](screenshots/09-supabase-admin-uuid.png)
> 💡 *화면 안내: 따옴표 안에 Step 8에서 복사한 UUID를 넣고 Run 버튼을 눌러 관리자 테이블에 등록합니다.*

---

### Step 10: 익명 인증 (Anonymous Sign-ins) 활성화
- **설정 위치**: 좌측 메뉴 **'Authentication'** → 상단 **'Providers'** 탭 → 맨 아래의 **'Anonymous sign-ins'** 선택.
- **활성화**: 토글 스위치를 켜서 **Enable** 상태로 변경한 후 하단의 **Save**를 누릅니다.

![Supabase 익명 인증 활성화 화면](screenshots/10-supabase-anon-auth.png)
> 💡 *화면 안내: Anonymous Sign-ins 스위치를 초록색(ON)으로 켜서 방문자 식별을 허용합니다.*

---

## Part C: 저장소 설정 파일 수정 (예상 소요 시간: 5분)

### Step 11: supabase-config.js 수정
- **수정 위치**: 브라우저에서 Fork한 본인의 GitHub 저장소로 이동합니다. 최상위 경로에 있는 `supabase-config.js` 파일을 클릭하고, 우측의 **연필 아이콘(Edit this file)**을 눌러 편집 모드로 들어갑니다.
- **수정할 내용**: Step 6에서 복사해 둔 Supabase 정보를 붙여넣습니다.
```javascript
// Public browser connection settings. Never put secret/service_role keys here.
window.MINIHOMPY_SUPABASE = Object.freeze({
  url: 'https://xxxxxxxx.supabase.co',        // Step 6의 Project URL
  publishableKey: 'eyJhbGciOi...',            // Step 6의 anon public key
});
```
- **저장**: 우측 상단의 **'Commit changes'** 버튼을 눌러 저장합니다.

![supabase-config.js 수정 화면](screenshots/11-github-edit-supabase-config.png)
> 💡 *화면 안내: GitHub 웹 에디터에서 URL과 anon key를 채워 넣은 뒤 'Commit changes...' 버튼을 누릅니다.*

---

### Step 12: visitor-identity-config.js 수정
- **단독 운영 모드 (중앙 연동 안 할 경우)**:
  `enabled: false`로 설정하여 저장합니다.
- **중앙 연동 모드 (다른 미니홈피들과 네트워크 연동할 경우)**:
  Step 14에 따라 `siteId`를 발급받아 입력하고 `enabled: true`로 설정합니다.

```javascript
window.MINIHOMPY_VISITOR_IDENTITY_CONFIG = Object.freeze({
  enabled: true,  // 또는 false
  siteId: '발급받은-site-id-uuid',
  centralApiUrl: 'https://중앙서버.supabase.co/functions/v1/identity-api',
  centralPageUrl: 'https://중앙서버.supabase.co/functions/v1/identity-page',
  healthTimeoutMs: 1500,
  guardTimeoutMs: 120000,
});
```

![visitor-identity-config.js 수정 화면](screenshots/12-github-edit-visitor-config.png)
> 💡 *화면 안내: visitor-identity-config.js 파일의 enabled 상태와 siteId를 입력하고 커밋합니다.*

---

### Step 13: 첫 배포 확인 및 관리자 로그인
- **배포 상황 확인**: GitHub 저장소 상단의 **'Actions'** 탭을 클릭하여 Pages 빌드 및 배포가 진행 중인지 확인합니다. 초록색 체크마크가 나타나면 배포가 완료된 것입니다.
- **접속**: `https://{username}.github.io/{repo}/` 주소로 접속합니다. (예: `https://henry.github.io/minihompy/`)
- **관리자 로그인 테스트**: 접속한 미니홈피 우측 상단의 **'관리자'** 버튼을 클릭하고 Step 8에서 생성한 이메일과 비밀번호로 로그인합니다.
  - 로그인 성공 시 버튼이 **'로그아웃'**으로 변경되며 설정 및 글쓰기 권한이 부여됩니다.

![GitHub Actions 배포 확인 및 로그인 화면](screenshots/13-github-actions-deploy.png)
> 💡 *화면 안내: Actions 탭에서 배포 성공(초록색)을 확인하고 내 미니홈피에서 관리자 로그인을 진행합니다.*

---

## Part D: 중앙 허브 오픈 연동 (선택)

### Step 14: 중앙 허브 사이트 셀프 등록
중앙 허브에 내 미니홈피를 등록하여 다른 사용자들과 계정을 공유하고 방문자 식별을 사용하려면, 오픈 등록 API를 통해 `siteId`를 발급받을 수 있습니다.

- **방법**: 터미널에서 다음 명령어로 간편하게 발급받거나 중앙 허브 웹 페이지에서 신청합니다:
```bash
curl -X POST https://{중앙서버}/functions/v1/identity-api/sites \
  -H "Content-Type: application/json" \
  -d '{
    "handle": "내_아이디",
    "display_name": "내_표시_이름",
    "origin": "https://{username}.github.io",
    "base_path": "/{repo}/",
    "homepage_url": "https://{username}.github.io/{repo}/",
    "login_url": "https://{username}.github.io/{repo}/?login_intent=",
    "supabase_project_ref": "내_supabase_project_ref"
  }'
```
- **응답 확인**: 반환되는 JSON 결과에서 `site_id`를 복사하여 Step 12의 `visitor-identity-config.js`에 입력합니다.

![중앙 허브 오픈 등록 화면](screenshots/14-central-registration.png)
> 💡 *화면 안내: 오픈 등록 요청을 통해 발급받은 고유 site_id를 내 미니홈피 설정 파일에 저장합니다.*

---

## 🛠️ 자주 묻는 질문 및 문제 해결 (Troubleshooting Tips)

- **Q. GitHub Pages 주소로 접속했는데 404 에러가 뜹니다.**
  - **A**: 배포가 아직 완료되지 않았을 수 있습니다. 저장소의 **'Actions'** 탭에서 워크플로우가 완전히 끝났는지(초록색 체크) 확인해 보세요. 또한 Step 3에서 Source를 'GitHub Actions'로 정확히 선택했는지 점검해 보세요.
- **Q. 로그인을 시도하면 에러가 발생하거나 데이터를 불러오지 못합니다.**
  - **A**: `supabase-config.js` 파일에 URL과 anon key가 오타 없이 정확히 입력되었는지 확인하세요. 큰따옴표나 작은따옴표 등의 문법이 깨지지 않았는지 확인이 필요합니다.
- **Q. 방문자 기록이나 댓글이 남지 않습니다.**
  - **A**: Step 10에서 Supabase의 **'Anonymous sign-ins'** 기능이 활성화되어 있는지 다시 한 번 확인해 보세요.
- **Q. 관리자 권한이 없다고 나옵니다.**
  - **A**: Step 9의 쿼리를 실행할 때 잘못된 UUID를 넣었거나 공백이 섞여 들어가지 않았는지 확인하세요. `auth.users` 테이블과 `private.minihompy_admins` 테이블에 일치하는 ID가 있는지 점검하세요.
- **Q. 중앙 연동을 켰는데 로그인 시 에러가 발생합니다.**
  - **A**: `visitor-identity-config.js`의 `centralApiUrl` 및 `centralPageUrl`이 정상 작동 중인지 확인하세요. 비상 시에는 `enabled: false`로 변경하여 언제든 단독 운영 모드로 되돌릴 수 있습니다.
