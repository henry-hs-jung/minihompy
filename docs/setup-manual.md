# 미니홈피 수동 셋업 가이드

이 가이드는 CLI 도구를 사용하지 않고 웹 브라우저(GitHub 및 Supabase 웹사이트)를 통해 직접 미니홈피를 구축하고자 하는 사용자를 위한 수동 설정 매뉴얼입니다.

**예상 소요 시간**: 약 25분 (Part A: ~5분, Part B: ~15분, Part C: ~5분)

---

## Part A: GitHub 셋업 (예상 소요 시간: 5분)

### Step 1: GitHub 계정 생성
- **URL**: [https://github.com/signup](https://github.com/signup)
- **주의사항**: 여기서 설정하는 사용자 이름(Username)이 향후 미니홈피 URL의 일부가 됩니다. (예: `username.github.io/repo-name`)
> 📸 **스크린샷**: [GitHub 회원가입 페이지에서 사용자 이름, 이메일, 비밀번호를 입력하는 화면] (추후 `screenshots/` 폴더에 추가 예정)

### Step 2: 저장소 Fork (복제)
- **원본 저장소**: [https://github.com/henry-phd-finance/minihompy](https://github.com/henry-phd-finance/minihompy)
- **Fork 방법**: 위 링크로 접속 후, 우측 상단의 **'Fork'** 버튼을 클릭합니다.
- **설정**: 
  - **Repository name**: `minihompy`로 설정하는 것을 권장합니다.
  - **Public/Private**: GitHub Pages의 무료 플랜을 사용하려면 반드시 **Public**으로 설정해야 합니다.
> 📸 **스크린샷**: [원본 저장소 우측 상단의 Fork 버튼 위치 및 새 Fork 생성 설정 화면] (추후 `screenshots/` 폴더에 추가 예정)

### Step 3: GitHub Pages 활성화
- **설정 위치**: Fork한 본인 저장소의 상단 메뉴 중 **'Settings'** 탭 클릭 → 좌측 사이드바에서 **'Pages'** 선택.
- **Source 설정**: **'Build and deployment'** 섹션의 Source 드롭다운에서 **'GitHub Actions'**를 선택합니다.
- **참고**: 설정을 마친 후 첫 배포가 완료되기까지 수 분 정도 소요될 수 있습니다.
> 📸 **스크린샷**: [저장소 Settings 탭의 Pages 메뉴에서 Source를 GitHub Actions로 변경하는 화면] (추후 `screenshots/` 폴더에 추가 예정)

### Step 4: GitHub Personal Access Token 발급
- **설정 위치**: 우측 상단 프로필 아이콘 클릭 → **'Settings'** → 좌측 사이드바 최하단 **'Developer settings'** → **'Personal access tokens'** → **'Fine-grained tokens'** 클릭 후 **'Generate new token'** 버튼 클릭.
- **필요한 권한 (Repository permissions)**: 
  - **Contents**: Read and Write
  - **Pages**: Read and Write
- **주의사항**: 생성된 토큰 문자열은 생성 직후 단 한 번만 표시되므로, 반드시 안전한 곳에 복사해 두세요.
> 📸 **스크린샷**: [Fine-grained token 생성 페이지에서 Repository permissions의 Contents와 Pages 권한을 설정하는 화면] (추후 `screenshots/` 폴더에 추가 예정)

---

## Part B: Supabase 셋업 (예상 소요 시간: 15분)

### Step 5: Supabase 계정 생성
- **URL**: [https://supabase.com](https://supabase.com)
- **가입 방법**: 우측 상단의 **'Start your project'** 버튼을 클릭하고 가입합니다. 가입 시 GitHub 계정 연동을 권장합니다.
> 📸 **스크린샷**: [Supabase 홈페이지 메인 화면 및 GitHub 계정으로 로그인/가입하는 화면] (추후 `screenshots/` 폴더에 추가 예정)

### Step 6: 새 프로젝트 생성
- **프로젝트 생성**: 대시보드에서 **'New project'** 버튼을 클릭합니다.
- **설정**: 
  - **Project name**: 원하는 이름(예: minihompy) 입력.
  - **Database password**: 안전한 비밀번호로 설정하고 꼭 기억해 두세요.
  - **Region**: 서비스할 지역(예: Seoul)을 선택합니다.
- **참고**: 프로젝트가 완전히 생성되고 준비되기까지 수 분이 소요될 수 있습니다.
- **정보 복사**: 프로젝트 준비가 완료되면 좌측 사이드바 하단의 **'Settings'** → **'API'** 메뉴로 이동하여 **'Project URL'**과 **'anon / public'** 키를 복사해 둡니다. (이후 Step 11에서 사용)
> 📸 **스크린샷**: [새 프로젝트 생성 화면 및 API 설정 페이지에서 URL과 anon key를 복사하는 화면] (추후 `screenshots/` 폴더에 추가 예정)

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
> 📸 **스크린샷**: [Supabase SQL Editor 화면 및 마이그레이션 코드를 붙여넣고 Run 버튼을 누르는 화면] (추후 `screenshots/` 폴더에 추가 예정)

### Step 8: 관리자 계정 생성
- **생성 위치**: Supabase 대시보드 좌측 메뉴 **'Authentication'** → 상단 **'Users'** 탭 → **'Add user'** → **'Create new user'** 선택.
- **설정**: 본인의 이메일과 비밀번호를 입력하고 계정을 생성합니다.
- **UUID 복사**: 생성된 계정 목록에서 방금 만든 사용자의 **'User UID'** 값을 클릭하여 복사합니다.
> 📸 **스크린샷**: [Authentication의 Users 탭에서 새 사용자를 추가하고 User UID를 확인하는 화면] (추후 `screenshots/` 폴더에 추가 예정)

### Step 9: 관리자 UUID 등록
관리자 권한을 부여하기 위해 다시 **'SQL Editor'**로 이동하여 다음 쿼리를 실행합니다.
```sql
INSERT INTO private.minihompy_admins (user_id) VALUES ('여기에-복사한-UUID를-넣으세요');
```
> 📸 **스크린샷**: [SQL Editor에서 관리자 권한 부여 쿼리를 실행하는 화면] (추후 `screenshots/` 폴더에 추가 예정)

### Step 10: 익명 인증 활성화
- **설정 위치**: 좌측 메뉴 **'Authentication'** → 상단 **'Providers'** 탭 → 맨 아래의 **'Anonymous sign-ins'** 선택.
- **활성화**: 토글 스위치를 켜서 **Enable** 상태로 변경한 후 저장합니다.
> 📸 **스크린샷**: [Authentication의 Providers 탭에서 익명 로그인을 활성화하는 화면] (추후 `screenshots/` 폴더에 추가 예정)

---

## Part C: 저장소 설정 파일 수정 (예상 소요 시간: 5분)

### Step 11: supabase-config.js 수정
- **수정 위치**: 브라우저에서 Fork한 본인의 GitHub 저장소로 이동합니다. 최상위 경로에 있는 `supabase-config.js` 파일을 클릭하고, 우측의 **연필 아이콘(Edit this file)**을 눌러 편집 모드로 들어갑니다.
- **수정할 내용**: Step 6에서 복사해 둔 Supabase 정보를 붙여넣습니다.
  - `url`: 복사한 **Project URL**
  - `publishableKey`: 복사한 **anon / public key**
- **저장**: 우측 상단의 **'Commit changes'** 버튼을 눌러 변경사항을 저장합니다.
> 📸 **스크린샷**: [GitHub 파일 브라우저에서 연필 아이콘을 클릭하여 파일을 수정하고 Commit changes 버튼을 누르는 화면] (추후 `screenshots/` 폴더에 추가 예정)

### Step 12: visitor-identity-config.js 수정
- **중앙 연동 안 할 경우**: `visitor-identity-config.js` 파일에서 `enabled: false`로 설정합니다.
- **중앙 연동 할 경우**: 별도의 안내에 따라 중앙 서버 운영자에게 `siteId` 발급을 요청한 뒤, 발급받은 ID를 파일에 업데이트해야 합니다. (Part D 참고)
> 📸 **스크린샷**: [visitor-identity-config.js 파일을 편집하는 화면] (추후 `screenshots/` 폴더에 추가 예정)

### Step 13: 첫 배포 확인
- **배포 상황 확인**: GitHub 저장소 상단의 **'Actions'** 탭을 클릭하여 Pages 빌드 및 배포가 진행 중인지 확인합니다. 초록색 체크마크가 나타나면 배포가 완료된 것입니다.
- **접속**: `https://{username}.github.io/{repo}/` 주소로 접속합니다. (예: `https://henry.github.io/minihompy/`)
- **관리자 로그인 테스트**: 접속한 홈피에서 우측의 로그인 영역을 통해 Step 8에서 만든 관리자 계정(이메일 및 비밀번호)으로 로그인이 잘 되는지 테스트합니다.
> 📸 **스크린샷**: [Actions 탭의 배포 완료 상태 화면과 미니홈피 로그인 성공 화면] (추후 `screenshots/` 폴더에 추가 예정)

---

## Part D: 중앙 연동 (선택)

### Step 14: 중앙 연동 신청
중앙 연동 서비스를 사용하려면 운영자에게 연락하여 고유한 `siteId`를 발급받아야 합니다.
- **절차**: 운영자에게 본인의 홈피 주소와 함께 연동을 신청합니다.
- **설정**: 발급받은 `siteId`를 GitHub 저장소의 `visitor-identity-config.js` 파일에 입력하고(상단에 `enabled: true` 변경 포함), **Commit changes**하여 배포합니다.

---

## 🛠️ 자주 묻는 질문 및 문제 해결 (Troubleshooting Tips)

- **Q. GitHub Pages 주소로 접속했는데 404 에러가 뜹니다.**
  - **A**: 배포가 아직 완료되지 않았을 수 있습니다. 저장소의 **'Actions'** 탭에서 배포가 완전히 끝났는지(초록색 체크) 확인해 보세요. 또한 Step 3에서 Source를 'GitHub Actions'로 정확히 선택했는지 점검해 보세요.
- **Q. 로그인을 시도하면 에러가 발생하거나 데이터를 불러오지 못합니다.**
  - **A**: `supabase-config.js` 파일에 URL과 anon key가 오타 없이 정확히 입력되었는지 확인하세요. 큰따옴표나 작은따옴표 등의 문법이 깨지지 않았는지 확인이 필요합니다.
- **Q. 방문자 기록이나 댓글이 남지 않습니다.**
  - **A**: Step 10에서 Supabase의 **'Anonymous sign-ins'** 기능이 활성화되어 있는지 다시 한 번 확인해 보세요.
- **Q. 관리자 권한이 없다고 나옵니다.**
  - **A**: Step 9의 쿼리를 실행할 때 잘못된 UUID를 넣었거나 공백이 섞여 들어가지 않았는지 확인하세요. `auth.users` 테이블과 `private.minihompy_admins` 테이블에 일치하는 ID가 있는지 점검하세요.
