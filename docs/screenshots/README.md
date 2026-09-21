# 미니홈피 수동 셋업 스크린샷 가이드

`docs/setup-manual.md`에 포함되는 14개 스크린샷 이미지들의 목록과 촬영 가이드입니다.
각 이미지는 본 폴더(`docs/screenshots/`)에 지정된 파일명으로 저장하면 매뉴얼에 자동으로 표시됩니다.

## 권장 사양
- **포맷**: PNG
- **해상도**: 가로 폭 1280px ~ 1920px (브라우저 창 크기 기준)
- **강조 표기**: 클릭하거나 입력해야 할 버튼/인풋 필드에 주황색 또는 빨간색 테두리(`border: 2px solid #ff6600`) 박스 권장

---

## 스크린샷 목록

| 번호 | 파일명 | 대상 URL / 화면 | 주요 강조 요소 |
|:---:|---|---|---|
| **01** | `01-github-signup.png` | `github.com/signup` | 사용자 이름(Username), 이메일, 비밀번호 입력란 |
| **02** | `02-github-fork.png` | `github.com/henry-phd-finance/minihompy` | 우측 상단 **Fork** 버튼 및 새 저장소 이름(`minihompy`), **Public** 라디오 선택 |
| **03** | `03-github-pages.png` | 저장소 Settings → Pages | Source 드롭다운에서 **GitHub Actions** 선택된 상태 |
| **04** | `04-github-pat.png` | GitHub Settings → Developer settings → PAT | Repository permissions의 **Contents (Read and Write)** 및 **Pages (Read and Write)** 체크 |
| **05** | `05-supabase-signup.png` | `supabase.com` | 메인 페이지 가입 또는 **Start your project** / GitHub 연동 로그인 버튼 |
| **06** | `06-supabase-new-project.png` | Supabase Dashboard → Settings → API | New Project 생성 폼 및 Settings → API 화면의 **Project URL**과 **anon public key** 복사 영역 |
| **07** | `07-supabase-sql-editor.png` | Supabase Dashboard → SQL Editor | SQL Editor 새 쿼리 창에 마이그레이션 코드를 붙여넣고 상단 **Run** 버튼을 가리키는 화면 |
| **08** | `08-supabase-create-user.png` | Authentication → Users | **Add user** → **Create new user** 팝업 (이메일 및 비밀번호 입력) |
| **09** | `09-supabase-admin-uuid.png` | Authentication → Users | 생성된 사용자의 **User UID**를 클릭/복사하는 영역 |
| **10** | `10-supabase-anon-auth.png` | Authentication → Providers | 하단의 **Anonymous sign-ins** 토글 스위치가 초록색(Enable)으로 켜진 화면 |
| **11** | `11-github-edit-supabase-config.png` | GitHub 저장소 → `supabase-config.js` | 연필(Edit) 아이콘 클릭 후 URL 및 key 입력, 상단 **Commit changes** 버튼 |
| **12** | `12-github-edit-visitor-config.png` | GitHub 저장소 → `visitor-identity-config.js` | `enabled: true / false` 설정 수정 후 **Commit changes** 버튼 |
| **13** | `13-github-actions-deploy.png` | GitHub 저장소 → Actions | `pages build and deployment` 워크플로우에 초록색 체크(성공) 표시된 화면 |
| **14** | `14-central-registration.png` | 중앙 허브 사이트 오픈 등록 화면 / curl | `POST /sites` 등록 요청 및 발급된 `site_id` 확인 화면 |
