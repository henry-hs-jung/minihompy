# 돋움 통일 전 폰트 사용 현황

이 문서는 변경 전 조사 기록이다. 2026-09-14 이후 현재 사이트는 `--ui-font: Dotum, '돋움', sans-serif`로 통일했으며 Galmuri 웹폰트를 로드하지 않는다. 탭의 가로 압축도 제거했다. 기존 크기·굵기·색상과 전체 화면 1.5배 확대는 유지한다.

2026-09-14, 6909257 기준. 폰트 변경 없이 styles.css, 메뉴 렌더러, 편집기, 공통 댓글 코드를 조사했다. 공개 화면의 일부 요소는 Linux Chromium의 computed style과 CSS.getPlatformFontsForNode로 확인했다. 관리자 편집 폼 및 당시 표시되지 않은 게시글 요소는 CSS/DOM 코드 기준이다. 아래 수치는 모두 확대 전 CSS px이며 큰 화면에서는 전체 zoom 1.5가 적용된다.

## 폰트 종류

| 표기 | CSS 설정과 실제 자산 | 용도 |
|---|---|---|
| G | Minihompy Home → Minihompy Extended → Dotum → 돋움 → sans-serif | 기본 본문. Home은 Galmuri11 일부 문자, Extended는 같은 Galmuri11 전체 파일 |
| T | Minihompy Tabs → Minihompy Home → Minihompy Extended → sans-serif | 우측 메뉴. Tabs도 같은 Galmuri11의 문자 서브셋 |
| A | Arial → sans-serif | 주로 숫자, 날짜, 영문 표제, 일부 기호 |
| D | Dotum → 돋움 → sans-serif | 관리자 로그인 창 |
| S | Georgia → serif | 사진첩 왼쪽 꽃 기호 한 곳 |

G는 대다수가 body에서 상속한다. 몇몇 입력/버튼은 같은 웹폰트 두 개를 명시하고 뒤에 Dotum, sans-serif를 붙인다. 댓글 입력·사진첩/게시판/다이어리 편집 입력 등이 이에 해당한다. 다이어리 날씨는 웹폰트 두 개 뒤에 곧바로 sans-serif를 쓴다. 즉 웹폰트가 지원하지 않는 문자의 대체 순서가 일부 다르다.

로컬 웹폰트는 모두 Galmuri11 Regular 계열이다. 세 CSS 이름이 서로 다른 서체라는 의미는 아니다. 등록된 @font-face는 모두 weight 400이며 제목/선택 항목의 700은 별도의 bold 파일이 아닌 브라우저 합성 굵기다. 탭은 font-synthesis:none으로 합성을 금지한다.

## 공통 프레임과 HOME

크기 표기는 글자 크기/줄높이. 명시하지 않은 일반 굵기는 400, bold는 700이다.

| 영역 | 폰트 | 크기/줄높이 | 선택자·특이점 |
|---|---|---|---|
| 전체 기본값 | G | 7/10 | body |
| 상단 검색·사이트 링크·로그인 버튼 | G | 6.5/8 | .site-bar |
| 미니홈피 제목 | G bold | 8/11 | .homepage-title, h1 기본 굵기 |
| TODAY/TOTAL | A | 5/8 | .visit-count |
| 일촌맺기·팬되기 | G | 5.5/8 | .header-actions |
| 우측 메뉴 탭 | T | 6/9 | .tab-label; scaleX(.92), 일반 굵기 |
| 왼쪽 자기소개 | G | 6/9 | .profile-status; 방명록의 HOME형 왼쪽 영역에서도 사용 |
| 왼쪽 이름·부가 문구 | G | 7/14, 5/14 | .profile-name, .profile-detail |
| HISTORY·화살표 | A bold | 4/8, 7/8 | .history-heading, .history-arrows |
| 파도타기·선택 화살표 | G, A | 6/8, 6/6 | .surf-select, 그 직계 span |
| 최근게시물·일촌평 제목 | G bold | 7/9 | HOME h2 |
| 최근게시물 안내 | G | 6/9 | .recent-empty |
| 게시판 통계 이름·숫자 | G, A | 6.5/13, 5/13 | .board-counts, dd |
| 미니라이프·미니룸·스토리룸 | G | 6.5/8 | .room-views |
| 미니룸 말풍선·일촌평 안내 | G | 6/9 | .room-balloon, .friends-prompt |
| 일촌신청 | G bold | 6/9 | .friend-request |
| 도움말·일촌평 기호 | A | 4/5, 4/6 | .help-mark, .friend-icon |
| 오른쪽 친구추천·관계·통계·선물가게 | G | 6.5/8 | .utility-panel |
| 오른쪽 통계 작은 숫자 | A | 4/8 | .utility-statistics small |
| 음악 선물하기 | G | 6/9 | .music-title |
| 플레이어 LIST | A | 3/4 | .playlist |

## 프로필

| 영역 | 폰트 | 크기/줄높이 | 선택자·특이점 |
|---|---|---|---|
| Profile 영문 표제 | A | 7/10 | .profile-navigation h2 |
| 내 소개·내 인맥·내 즐겨찾기 | G bold | 7/9 | .profile-group-button |
| 소개·키워드 등 하위 메뉴 | G | 6.5/9 | .profile-section-button; 선택 시 bold |
| 별 기호 | A | 10/12 | .profile-nav-icon; 사람 아이콘은 CSS 도형 |
| 소개의 이름·본문 | G | 7/10 | .profile-introduction; 이름도 일반 굵기 |
| 소개 편집 라벨·입력·버튼 | G | 7/11 | .profile-editor 및 settings-* 공용 스타일 |

키워드·히스토리·42문답·기본정보·내 인맥·내 즐겨찾기는 본문이 비어 있어 현재 본문 폰트 사용 사례가 없다.

## 사진첩

| 영역 | 폰트 | 크기/줄높이 | 선택자·특이점 |
|---|---|---|---|
| PHOTO ALBUM | A bold | 7/10 | .photo-sidebar-heading h2 |
| 태그·왼쪽 배너 | G | 5/8, 6/7 | .photo-tag-label, .photo-memory-banner |
| 배너 꽃 기호 | S | 19/20 | .photo-memory-flower, ✿ |
| 폴더·구분선 | G | 7/10 | .photo-folder, .photo-folder-divider; 구분선 bold |
| 왼쪽 하단 | G | 6/10 | .photo-folder-footer |
| 폴더 설명 | G | 7/10 | .photos-scroll 기본값 |
| 공개 범위 요약·보기 방식 | G | 6.5/10 | .photo-summary, .photo-mode |
| 게시물 수 | A | 6.5/10 | .photo-count |
| 게시글 제목 | G bold | 7/10 | .photo-post-title, h3 기본 굵기 |
| 작성자 | G | 6/10 | .photo-post-meta |
| 작성 시각·스크랩 | A | 5.5/10 | .photo-date, .photo-scraps |
| 본문 | G | 7/11 | .photo-caption |
| 공개설정 | G | 6/10 | .photo-privacy |
| 페이지 번호 | A | 7/10 | .photo-pagination; 선택 시 bold |
| 글쓰기·수정·삭제·사진 버튼 | G | 7/10 | .photo-editor button, .photo-post-actions button 등 |
| 편집 제목·폴더·본문 | G | 7/11 | .photo-editor-title, .photo-editor-folder, .photo-editor-content |

Quill은 별도 테마 CSS/폰트 선택 기능을 로드하지 않는다. .ql-editor는 위 본문 폰트를 상속하며, Quill 때문에 자동으로 다른 서체가 적용되는 구조는 아니다.

## 다이어리

| 영역 | 폰트 | 크기/줄높이 | 선택자·특이점 |
|---|---|---|---|
| DIARY | A bold | 7/10 | .diary-sidebar h2 |
| 왼쪽 폴더 | G | 7/10 | .photo-folder 공용 스타일 |
| 왼쪽 그룹 제목·부제·하단 | G | 7/10, 6/10 | .diary-folder-heading, .secondary, .diary-footer |
| 일기 쓰기 | G | 6/9 | .diary-write |
| 왼쪽 쓰기 영역 문구 | G | 6/12 | .diary-write-label |
| 큰 날짜 숫자 | A bold | 13/16 | .diary-date-badge strong |
| 날짜 보조 글자 | G | 5/7 | .diary-date-badge span |
| 연월·이동 화살표 | A | 5/8, 8/8 | .diary-month 및 버튼 |
| 달력 날짜 | A | 5/9 | .diary-day; 글 있는 날 bold |
| 전체 공개 안내 | G | 5.5/9 | .diary-summary |
| 글 날짜·시간 헤더 | A bold | 6/10 | .diary-entry-header |
| 날씨 | G | 5.5/10 | .diary-weather; 시스템 대체 순서는 sans-serif |
| 본문 | G | 7/11 | .diary-entry-body |
| 빈 일기 안내 | G | 6/10 | .diary-empty |
| 편집 제목·입력·본문·상태 | G | 7/11 | .diary-editor, 입력 요소, .diary-status; 제목 bold |
| 수정·삭제·재시도 | G | 7/10 | .diary-actions button, .diary-retry |

## 방명록

| 영역 | 폰트 | 크기/줄높이 | 선택자·특이점 |
|---|---|---|---|
| 왼쪽 프로필 | G, A | HOME과 동일 | HOME 프로필 컴포넌트 재사용 |
| 작성 이름·본문 입력 | G | 7/10 | .guestbook-name, textarea |
| 미니미·사진·비밀로 하기 | G | 5.5/10 | .guestbook-compose-options |
| 확인 버튼 | G | 6/10 | .guestbook-compose-options button |
| 방문객 이름 | G | 6/10 | .guestbook-post-header의 .guestbook-author |
| 글 번호 | A | 5/10 | .guestbook-number |
| 작성 시각 | A | 5/9 | .guestbook-post-header time |
| 수정·삭제·비공개 전환 | G | 5/7 | .guestbook-actions button |
| 본문 | G | 7/10 | .guestbook-text |
| 비밀글 안내 | G | 5.5/9 | .guestbook-private-notice |
| 페이지·재시도·상태 | G | 7/10 | .guestbook-pagination, .guestbook-retry, .guestbook-status |

공개/비공개는 제목 띠 등의 색상 차이이고 폰트 종류는 같다. 이름 옆 집 아이콘은 이미지이므로 폰트가 아니다.

## 게시판

| 영역 | 폰트 | 크기/줄높이 | 선택자·특이점 |
|---|---|---|---|
| BOARD | A bold | 7/10 | .board-sidebar h2 |
| 폴더·폴더 제목 띠 | G | 7/10 | .board-folder, .board-heading; 선택 폴더 bold |
| 폴더 설명·목록 요약 | G | 6/8 | .board-description, .board-summary |
| 게시물 수 | A | 6/8 | .board-count |
| 목록 열 제목·작성자 | G | 6/10 | .board-table th, .board-list-author |
| 목록 글 제목 | G | 7/12 | .board-post-link |
| 목록 번호·날짜 | A | 5.5/10 | .board-number, .board-list-date |
| 상세 제목 | G bold | 7/11 | .board-post-title |
| 상세 작성자 | G | 7/10 | .board-meta 상속 |
| 상세 작성 시각 | A | 5.5/10 | .board-date |
| 본문 | G | 7/11 | .board-body |
| 공개설정 | G | 6/10 | .board-privacy |
| 페이지 번호 | A | 6/10 | .board-pagination; 선택 시 bold |
| 글쓰기·목록·확인·취소·수정·삭제 | G | 6/9 | .board-small-button, .board-post-actions button |
| 편집 제목·폴더·본문·상태 | G | 7/11 | .board-editor 입력, h3, .board-status; 제목 bold |

## 공통 댓글

| 영역 | 폰트 | 크기/줄높이 | 특이점 |
|---|---|---|---|
| 사진첩·다이어리·게시판 댓글 이름/본문 | G | 6.5/10 | 공통 .photo-comment |
| 방명록 댓글 이름/본문 | G | 6/9 | .guestbook-comment로 분기 |
| 위 세 메뉴 댓글 날짜 | A | 5.5/9 | .photo-comment-date |
| 방명록 댓글 날짜 | A | 5/9 | .guestbook-comment time이 덮어씀 |
| 모든 메뉴 댓글 이름/본문 입력 | G | 6/10 | .comments-widget .comment-form input |
| 댓글 확인·취소 | G | 6/10 | .photo-comment-input button |
| 댓글 수정·삭제 | G | 5/9 | .comment-actions button |
| 댓글 상태 안내 | G | 6/9 | .comment-status |
| 댓글 페이지 번호 | A | 6/9 | .comment-navigation |
| 댓글 페이지 이동·새로고침 | A | 7/9 | .comment-navigation button |
| 댓글 재시도 | G | 7/10 | .comment-retry; 위 페이지 이동과 CSS 규칙 일부 공용이나 상속 부모가 다름 |

과거 .board-comment-input CSS는 남아 있지만 현재 게시판 댓글은 공통 댓글 위젯으로 출력된다.

## 관리자 설정과 로그인

| 영역 | 폰트 | 크기/줄높이 | 특이점 |
|---|---|---|---|
| SETTING | A bold | 7/10 | .settings-sidebar h2 |
| 설정 왼쪽 메뉴 | G | 7/10 | .settings-section; 선택 시 bold |
| 설정 제목·라벨·입력·안내·저장 | G | 7/11 | .settings-scroll, settings-field 등; 제목 bold |
| 메뉴 순서 위/아래 화살표 | A | 10/12 | .settings-order |
| 로그인 창 기본·입력·버튼 | D | 11/17 | .admin-dialog; 웹폰트 미사용 |
| 로그인 창 제목 | D bold | 12/17 | .admin-dialog h2 |

음악·갤러리·동영상 메뉴는 아직 빈 화면으로 등록되어 본문 폰트가 없다. 우측 탭이 표시되면 공통 T를 사용한다.

## 실제 대체 폰트와 통일 검토 지점

Linux Chromium 관측: 웹폰트는 Galmuri11 Regular, Arial 지정 요소는 Liberation Sans, 로그인 제목의 한글은 WenQuanYi Zen Hei/공백 등은 Liberation Sans, 사진첩 꽃 기호는 Unifont로 표시됐다. 이는 검사 환경의 결과이며 사용자의 Windows/macOS 결과를 뜻하지 않는다. Arial·돋움·Georgia 파일을 배포하지 않으므로 OS와 글자 지원 범위에 따라 대체된다.

- 전역 자간은 0이다. Chromium computed style에서는 normal로 표시되기도 한다. 탭의 좁은 느낌은 자간 값이 아닌 scaleX(.92)에서 나온다.
- 같은 Galmuri여도 6, 6.5, 7px 및 normal/bold, 9/10/11px 줄높이 차이가 있다. 1.5배에서는 각각 9, 9.75, 10.5px 등으로 확대되어 인상이 달라진다.
- 이름이 서로 다른 세 웹폰트는 실제로 같은 글꼴이므로 합쳐도 서체 자체가 통일되는 변화는 거의 없다.
- 통일 검토 우선 대상은 로그인 시스템 폰트, 댓글 메뉴별 크기 차이, 본문 줄높이 차이, 대체 폰트 순서다. 원본 역할 구분용 Arial 숫자/영문과 이미 보정한 탭을 함께 바꿀지는 별도 결정이 필요하다.
- 프로필 그림 말풍선·배너 등 이미지 안의 글자는 CSS 폰트와 별개다. 이미지에 포함된 원본 글꼴은 이 코드 조사만으로 식별할 수 없으며 CSS 변경으로 통일되지 않는다.
