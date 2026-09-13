# 게시판 DB 1단계

후속 상태: 사용자가 실제 Supabase에 적용했고 공개 API 조회도 확인했다. 앱 연결은 [게시판 작성 연결](board-writing.md)에 기록했다. 아래의 '샘플 표시'는 1단계 당시 상태다.

## 적용

선행 마이그레이션: `202609130001_identity.sql` (적용 완료).

Supabase SQL Editor에서 `supabase/migrations/202609130002_board.sql` 전체를 한 번 실행한다. 하나의 트랜잭션이며 실패하면 롤백된다. 재실행용 스크립트가 아니므로 이미 성공했다면 반복하지 않는다.

이 작업은 `board_folders`, `board_posts`와 인덱스, 제약 조건, 권한 정책, 수정 시각 트리거를 만든다. 자유게시판 폴더 하나를 생성하고 글은 빈 상태로 시작한다. 기존 화면의 창작 샘플 글을 실데이터로 복사하지 않는다. 현재 앱은 여전히 샘플을 읽으며 이번 단계에서는 화면과 저장 연결을 바꾸지 않았다.

## 데이터 계약

폴더: UUID `id`, `kind`(folder/divider), `label`, `description`, `sort_order`. 깊이는 1단계로 고정한다. 동순위는 ID로 정렬한다. 구분선은 빈 이름·설명만 허용하고 게시글을 담을 수 없다. 폴더와 구분선 간 종류 변경은 허용하지 않는다. 글이 남아 있는 폴더 삭제는 거부하므로 먼저 글을 이동하거나 삭제해야 한다.

게시글: UUID `id`, `folder_id`, 고정 `folder_kind`, `author_id`, 작성 시 표시 이름 `author_name`, `title`, 일반 텍스트 `body`, 서버 시각 `created_at`, `updated_at`. 작성자 UID·ID·시각·이름을 수정 요청으로 바꿀 수 없다. 닉네임 변경은 과거 글에 소급하지 않는다. UI 표시 이름은 작성 시 저장하며 관리자인지의 판단 근거로 사용하지 않는다.

제목 120자, 본문 50,000자, 작성자 이름 20자 제한. 본문 HTML은 다음 UI 단계에서도 실행하지 않는다. 최신순 페이지 조회는 `created_at DESC, id DESC`로 안정적인 순서를 사용하고 폴더/전체보기별 count와 range를 요청한다. 새 글 유입 시 offset 페이지가 달라질 수 있으므로 목록 재조회 시 페이지 범위를 보정한다.

모든 게시판 글은 이번 단계에서 공개다. 비공개 글·임시 저장은 이 테이블에 저장하면 안 된다. `author_id`는 공개 소유권 식별자이며 이메일·인증 토큰은 포함하지 않는다. Auth 사용자 삭제 시 글은 보존하고 작성자 UID만 null로 바꾼다. 소유권을 닉네임으로 복구하지 않는다.

조회수 집계, 댓글, 첨부파일, 방문자 작성, 공개/비공개 게시판, config 이전은 이번 마이그레이션 범위가 아니다. 방명록의 관리자 공개→비공개 전환은 이후 방명록 전용 정책으로 구현한다.

## 권한

| 작업 | 세션 없는 방문자 | 인증 방문자 | 관리자 |
| --- | --- | --- | --- |
| 폴더·공개 글 조회 | 허용 | 허용 | 허용 |
| 폴더 생성·편집·삭제 | 거부 | 거부 | 허용 |
| 새 글 작성 | 거부 | 거부 | 허용 |
| 본인 글 수정·삭제 | 불가 | 허용 | 허용 |
| 타인 글 수정 | 거부 | 거부 | 거부 |
| 타인 글 삭제 | 거부 | 거부 | 허용 |

현재 방문자 글 생성 정책은 없다. 본인 글 수정·삭제 정책은 향후 방문자 작성을 위한 소유권 규칙이다. 관리자도 남의 글 수정이나 작성자 바꿔치기는 불가능하다. 클라이언트는 INSERT에 `folder_id, author_name, title, body`만, UPDATE에 `folder_id, title, body`만 보내야 한다.

테이블 기본 권한을 회수한 뒤 필요한 열과 작업만 허용했다. RLS의 행 소유권 검사와 열 단위 권한을 함께 적용한다. 프로젝트 소유자 SQL과 서버 고권한 키는 이러한 브라우저 권한 모델의 밖에 있으므로 배포 코드에 넣지 않는다. [Supabase 열 권한 문서](https://supabase.com/docs/guides/database/postgres/column-level-security)

## 검증

PGlite 0.5.8의 로컬 PostgreSQL 엔진에서 두 마이그레이션을 실제 실행했다. Supabase Auth의 역할·UID 함수를 최소한으로 모사해 `anon`, 관리자, 작성 방문자, 타 방문자 역할로 권한을 검사했다. 실제 호스팅 Supabase/PostgREST 통합 검증은 적용 후 별도로 필요하다.

```sh
npm install --prefix /tmp/cyworld-db-check @electric-sql/pglite@0.5.8 --ignore-scripts
node scripts/verify-board-db.mjs /tmp/cyworld-db-check/node_modules/@electric-sql/pglite/dist/index.js
```

검사: 공개 조회, 관리자 생성/본인 수정, 방문자 생성 차단, 타인 수정/삭제 차단, 관리자 타인 수정 차단/삭제 허용, 작성자·날짜·ID·표시 이름 위조 차단, 빈 제목 거부, 구분선 FK, 비어 있지 않은 폴더 삭제 거부, 관리자 목록 비공개. Supabase 비밀번호나 비밀 키 없이 수행했다.
