# 구조 작업 3: 메뉴 전환

Config의 표시 여부·배열 순서로 탭을 구성하고 클릭, Enter, 해시 주소와 왼쪽/본문/선택 표시를 연결했다. 사용자 문구와 여섯 메뉴 설정은 유지했고 Config의 오래된 설명 주석만 갱신했다.

- [현재 여섯 메뉴](current-579.png), [홈·사진첩·방명록](three-579.png)
- [모바일 오른쪽](three-375-right.png), [아홉 탭 참고 HOME](reference-home.png)
- [검사 결과](results.json), [Config 회귀 검사](config-check/config-results.json)

Chromium DPR 1의 579×349, 1280×800, 375×812에서 다섯 설정 사례씩 총 15개를 검사했다. 현재 메뉴, 세 메뉴, 순서 변경과 홈 숨김, 전체 숨김, 잘못된 항목·중복 ID를 포함한다.

탭 간 빈틈 없음, 선택 전후 좌표·높이 불변, 선택 표시 하나, 두 영역의 동일 메뉴 ID, 빈 메뉴에서 스크롤바 숨김, 클릭·Enter·뒤로/앞으로·새로고침, 잘못된/숨긴 ID와 깨진 주소의 기본 화면 처리, 모바일 204px 이동, 외부 요청·로딩 오류 없음을 확인했다. 아홉 탭을 사용한 참고 HOME은 작업 7 캡처와 파일 내용이 동일하다. 세 메뉴와 모바일 캡처를 육안 확인했다.

홈은 필수가 아니며 숨겨졌으면 첫 번째 표시 메뉴로 이동한다. 유효한 표시 메뉴가 전혀 없을 때만 홈 하나를 복구한다. 사진첩·방명록 등은 빈 영역이며 세부 디자인·데이터 기능은 추가하지 않았다. 기존 이름 길이에 따른 관계 영역 넘침과 긴 메뉴 이름 처리 기준은 4번에 남아 있다.

```sh
node scripts/verify-navigation.mjs /path/to/playwright/index.mjs
node scripts/verify-config.mjs /path/to/playwright/index.mjs docs/verification/navigation-step3/config-check
```

이전 단계의 검사는 고정 탭·클릭 미연결을 가정하므로 현재 회귀 판정에는 위 명령을 사용한다. current 사례는 작업 당시의 여섯 메뉴를 기대한다.
