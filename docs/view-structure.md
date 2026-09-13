# 메뉴별 화면 구조

## 파일 역할

| 파일 | 책임 |
| --- | --- |
| `config.js` | 개인 문구와 메뉴 설정. 이번 단계에서는 사용자 수정 내용을 보존 |
| `index.html` | 상단·방문자·제목·프레임·고리·탭·우측 부가 영역 및 두 콘텐츠 영역 |
| `content.js` | Config 타입 확인·텍스트 연결·긴 문구 말줄임 및 툴팁 |
| `views/index.js` | 미구현 메뉴 여섯 개의 빈 화면 정의 |
| `views/diary.js`, `diary-data.js` | D10 다이어리 날짜·폴더 탐색과 샘플 일기 |
| `views/photos.js` | 사진첩 폴더와 게시글·페이지 이동·내부 스크롤 |
| `photos-data.js` | 사진첩 샘플 폴더·구분선·게시물 데이터 |
| `views/home.js` | HOME 왼쪽과 본문 내용의 유일한 마크업 원본 |
| `app.js` | 표시 메뉴 구성·기본 화면·주소·선택 표시·두 영역 교체 |
| `styles.css` | 기존 고정형 외형과 HOME 스타일. HOME 제목 스타일은 HOME에만 적용 |

`data-view-slot="left"`와 `data-view-slot="main"`을 가진 section은 공통 프레임의 일부로 유지한다. 기존 `profile-panel`, `home-panel` 클래스명은 좌표 보존을 위해 남겼으며, `data-view`가 실제 표시 중인 화면 ID다. 전환 시 section 자체는 교체하지 않고 내부 자식만 교체한다.

## 관리자 설정 추가 이후

`config.js`는 DB 설정 저장소이며 app은 조회 완료 후 일반 메뉴를 만든다. 관리자 확인 이벤트마다 설정 탭을 마지막에 추가/제거한다. `settings`는 일반 메뉴 배열과 분리된 예약 ID다. 전체 일반 메뉴 숨김은 허용하며 HOME 자동 복구는 하지 않는다. 설정 조회 실패 시에도 관리자 설정 접근은 유지한다. 아래 초기 단계의 동기 config/기본 HOME 설명은 현재 [설정 문서](configuration.md)로 대체한다.

## 화면 정의 계약

각 `MINIHOMPY_VIEWS[id]`는 `label`, `showScrollbar`, `createLeft()`, `createMain()`을 가진다. 두 함수는 호출할 때마다 새로운 `DocumentFragment`를 반환한다. 왼쪽과 본문은 서로 다른 내용을 독립적으로 정의할 수 있다.

새 메뉴 구현 시 `views/photos.js` 같은 파일에서 해당 ID의 빈 정의를 대체하고, `index.html`에서 `views/index.js` 뒤, `app.js` 앞에 defer 스크립트로 추가한다. `views/home.js`를 구조 예제로 참고하되 HOME 전용 콘텐츠·스타일은 그대로 복사하지 않는다. 문구에는 `data-config`를 사용하며 설정값을 HTML 문자열에 삽입하지 않는다. 새 CSS는 해당 메뉴의 클래스 또는 `[data-view="photos"]` 아래로 범위를 한정한다.

현재 미구현 메뉴는 양쪽 모두 빈 fragment를 반환한다. 사진첩은 후속 구현을 완료했으며 자체 스크롤바와 폴더·게시글 화면을 제공한다. 정적 HOME 스크롤바는 HOME 외 화면에서 숨긴다. 사진첩 구현 기록은 [사진첩 검증](verification/photos-step2/README.md)을 참고한다.

## 내부 표시 함수

개발자 콘솔이나 테스트에서 `MinihompyApp.renderView('photos')`를 호출하면 두 영역을 함께 교체한다. `renderView('home')`으로 돌아오면 Config를 다시 적용한 HOME이 만들어진다. `MinihompyApp.currentView`는 현재 내부 표시 ID다.

두 fragment를 먼저 만들고 검증한 뒤 교체하므로 한쪽 생성에 실패하면 기존 화면을 유지한다. 3번부터 숨긴/알 수 없는 ID는 기본 메뉴로 이동하고 `false`를 반환한다. 기본 메뉴는 표시 가능한 홈 또는 첫 표시 메뉴다. 유효한 요청은 `true`를 반환하며 같은 메뉴 재선택은 DOM을 다시 만들지 않는다.

3번부터 `renderView`가 두 영역·선택 탭·해시 주소를 동기화한다. 실제 fragment 교체는 내부 `showView`가 담당한다. 일반 탐색은 pushState, 잘못된 주소 교정은 replaceState를 사용하며 해시 변경도 감지한다. 첫 탭 17px, 나머지 18px 높이는 선택 여부와 무관하다. Config는 메뉴 표시를 제어하며 로그인 권한을 제공하지 않는다.

공통 영역 문구만 다시 적용할 때는 `MinihompyContent.apply()`를 쓴다. 메뉴 렌더러는 새 fragment에 같은 바인딩을 적용한다. DOM 재사용·작성 폼 상태 저장·데이터 조회·이벤트 수명주기 등의 확장은 아직 필요하지 않아 추가하지 않았다.

## 확장 순서

1. 조사 후 `views/photos.js`에서 `MINIHOMPY_VIEWS.photos`를 정의한다. `createLeft`와 `createMain`은 각각 새로운 fragment를 반환한다.
2. 해당 파일을 `views/index.js` 뒤, `app.js` 앞에 defer 스크립트로 추가한다. 공통 프레임이나 다른 메뉴를 다시 만들지 않는다.
3. `[data-view="photos"]` 또는 전용 클래스로 CSS를 한정한다. 양쪽 영역의 크기와 바인더 위치는 공통 기준을 따른다.
4. `config.js`의 photos 항목을 켜고 원하는 위치에 둔다. 새 ID라면 먼저 화면을 등록해야 한다. 기존 아홉 메뉴를 넘는 추가 탭은 별도 레이아웃 검토가 필요하다.
5. 새 편집 문구는 Config 문자열과 `data-config`로 연결한다. 고정 UI 문구와 설정을 구분하며 사용자 문자열을 innerHTML에 보간하지 않는다. 새로운 줄바꿈·본문 데이터 구조는 메뉴에 맞게 별도 정의한다.
6. 메뉴 직접 접근·다른 메뉴에서 복귀·키보드·모바일·긴 문구를 검증하고 `scripts/verify-navigation.mjs`의 빈 화면 가정을 실제 화면 검사로 갱신한다.

`MinihompyContent.fit()`은 문구를 변경하지 않고 현재 DOM의 넘침과 툴팁을 갱신한다. 렌더러는 두 영역을 삽입한 뒤 호출하며 폰트 로딩 후에도 다시 확인한다. 새 문구 요소에는 공간 제약과 말줄임 정책을 함께 정의해야 한다. 기존 선택자 목록에 들어 있지 않은 새 콘텐츠가 자동으로 안전하게 배치되는 것은 아니다.
