# 분산 미니홈피 공통 방문자 식별(Shared Visitor Identity) 검수 기록

본 문서는 분산 미니홈피 클라이언트의 공통 방문자 식별 연동 기능(`visitor-identity-config.js`, `visitor-identity.js`, `visitor-identity-login.js`, UI 연동)에 대한 검증 결과와 실행 지침을 기록합니다.

---

## 검증 대상 및 범위

1. **설정 및 코어 파이프라인 (`visitor-identity-config.js`, `visitor-identity.js`)**:
   - 중앙 허브 URL 및 `site_id` 설정.
   - 중앙 서버 상태 확인(`GET /health`) 1.5초 타임아웃 및 장애 시 즉시 익명 폴백.
   - `sessionStorage` 기반 2분 만료 리다이렉트 가드 및 `attempt_id` 난수 생성.
   - 리다이렉트 반복 방지(루프 차단): 이미 확인된 세션의 중복 이동 억제.
   - URL fragment(`#vt=...`) 해석, `POST /visits/resolve` 호출 및 `history.replaceState`를 통한 원래 내부 라우트(예: `#/board`) 복원.
2. **화면 UI 연동 (`index.html`, `styles.css`, `admin-auth.js`)**:
   - 상단 `site-bar` 검색창 우측(`.visitor-display`) 방문자 이름(`방문자: A님`) 표시.
   - 우측 상단 방문자 버튼(`#visitor-auth-toggle`): 익명 시 `로그인`, 식별 시 `로그아웃` (클릭 시 중앙 이동).
   - 관리자 로그인 분리: `#admin-auth-toggle` ('관리자' / '로그아웃') 및 URL `?admin=login` 파라미터 감지 지원.
3. **타 미니홈피 로그인 활성화 (`visitor-identity-login.js`)**:
   - `?login_intent=...` 유입 시 로컬 Supabase 세션 확인.
   - 기존 세션 존재 시 비밀번호 입력 없이 재사용.
   - `POST /activation-tickets` 요청 및 중앙 `/complete#ticket=...` 복귀.
4. **기존 기능 회귀 검증**:
   - 방명록/댓글 작성용 로컬 익명 세션(`createMinihompyIdentity`) 100% 정상 작동.
   - 기존 관리자 인증 다이얼로그 및 세션 판정 무회귀.

---

## 검증 실행 명령어

터미널에서 아래 테스트를 실행하여 검증 결과를 확인할 수 있습니다:

```bash
# 1. 신규 클라이언트 방문 식별 모듈 통합 단위 테스트 (8대 시나리오)
node scripts/verify-visitor-identity-client.mjs

# 2. 기존 로컬 익명 식별 기능 회귀 검증
node scripts/verify-identity.mjs
```

---

## 검증 시나리오 및 통과 결과

| 번호 | 검증 항목 | 상세 내용 | 결과 |
| :---: | :--- | :--- | :---: |
| 1 | **로컬 익명 세션 하위 호환성** | 닉네임 정규화, 로컬 세션 검증, createMinihompyIdentity 동작 | **PASS** |
| 2 | **비활성화 설정 격리** | `enabled: false` 설정 시 네트워크 요청 없이 즉시 익명 확정 | **PASS** |
| 3 | **중앙 서버 다운/타임아웃 폴백** | 1.5초 타임아웃 초과 또는 연결 실패 시 리다이렉트 없이 익명 폴백 (화면 먹통 방지) | **PASS** |
| 4 | **최초 방문 리다이렉트 & 가드 생성** | 헬스체크 성공 후 `attempt_id` 생성, `sessionStorage` 가드 저장, 최상위 `/visit` 이동 | **PASS** |
| 5 | **무한 루프 방지** | 가드가 이미 존재하는 상태에서 토큰 없이 복귀 시 추가 리다이렉트 차단 | **PASS** |
| 6 | **토큰 복귀 & 라우트 복원** | `#vt=...` 수신 시 `/visits/resolve` 호출, 가드 해제, 주소창 fragment 청소 및 내부 라우트(`#/board`) 복원 | **PASS** |
| 7 | **UI 바인딩 및 이벤트 반응** | 식별 시 검색창 우측 이름 노출 + 버튼 `로그아웃` 전환, 익명 시 이름 숨김 + 버튼 `로그인` 전환 | **PASS** |
| 8 | **로그인 의도 및 활성화 플로우** | `login_intent` 감지 시 로컬 세션 재사용, `/activation-tickets` 요청, `/complete` 복귀 | **PASS** |

---

## 보안 및 개인정보 보호 사항

- **시크릿 격리**: 클라이언트 설정(`visitor-identity-config.js`)에는 공개 가능한 `siteId`와 `centralUrl`만 포함되며, HMAC 서명 키나 Supabase service-role 키는 일절 포함되지 않습니다.
- **주소창 토큰 노출 방지**: 중앙에서 복귀한 직후 `history.replaceState`를 호출하여 URL fragment에서 토큰을 즉시 제거하므로 복사된 URL이나 브라우저 히스토리에 토큰이 노출되지 않습니다.
- **권한 분리**: 공통 방문자 식별 상태는 오직 방문자 표시 및 향후 소셜 편의 기능에만 사용되며, 게시글 수정/삭제나 설정 변경 등의 관리자 권한은 언제나 로컬 Supabase의 RLS 및 관리자 인증을 통해서만 판정됩니다.
