# GitHub Pages 배포

- 저장소: https://github.com/henry-phd-finance/minihompy (공개)
- 홈페이지: https://henry-phd-finance.github.io/minihompy/
- 배포: `.github/workflows/pages.yml`, `main` push 또는 Actions 수동 실행.
- Pages Source는 GitHub Actions. `scripts/build-pages.mjs`가 `_site/`에 런타임 파일만 모은다. docs, scripts, SQL은 사이트에 배포하지 않는다. 공개 Git 저장소에서는 읽을 수 있다.

`references/`는 Git 및 Pages에서 제외한다. 생성된 검수 PNG/HTML도 제외하되 HOME 픽셀 검사 기준 PNG 한 장은 보존한다. 로컬 파일은 삭제하지 않는다. 연구 문서의 references/ 링크와 일부 검수 이미지 링크는 공개 저장소에서 열리지 않는다. 실행용 assets/의 그림과 폰트는 홈페이지 표시를 위해 배포한다.

Supabase publishable key는 브라우저용 공개 키다. secret/service_role 키나 관리자 비밀번호는 Git과 Actions secrets에 추가하지 않는다. 데이터 접근 권한은 기존 Supabase RLS가 집행한다.

현재 인증은 관리자 이메일/비밀번호와 방문자 익명 인증이며 리다이렉트 로그인은 사용하지 않는다. 배포 주소는 localhost와 별도 origin이라 관리자 재로그인이 필요하고, 방문자 식별/닉네임도 별도로 저장된다. localhost 방문자가 작성한 글의 수정 권한을 배포 주소로 자동 이전하지 않는다.

라우팅은 `#/home`, `#/photos` 등의 해시 경로여서 Pages의 별도 SPA fallback은 필요하지 않다. DB 설정에 저장된 문구를 바꾸는 데 Git push는 필요 없다. 코드/스타일 변경은 커밋 후 main으로 push한다.

공식 구성 참고: [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## 배포 검증

2026-09-13 첫 배포 성공. GitHub Pages 환경의 허용 브랜치는 main으로 설정했다. `scripts/verify-pages.mjs`가 실제 공개 주소의 1000/375px 화면에서 6개 메뉴, 이미지 로딩, DB 조회, 해시 경로 새로고침, 579px 프레임을 검사했다. references/SQL/docs 경로가 사이트에서 404인 것도 확인했다. 운영 쓰기나 계정 생성은 하지 않았다. GET 및 조회 전용 diary_written_dates RPC만 허용한 검사다.

```sh
CHROMIUM_PATH=/path/to/chromium node scripts/verify-pages.mjs /path/to/playwright/index.mjs
```

관리자 로그인·실제 저장은 배포 주소에서 사용자가 확인한다. 검수 캡처는 로컬 `docs/verification/deployment/`에만 보관한다.
