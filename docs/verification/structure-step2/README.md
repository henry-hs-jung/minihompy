# 구조 작업 2 검증

HOME 내용을 공통 외형에서 분리하고 왼쪽·본문을 메뉴별로 교체하는 기반을 마련했다. 실제 탭 클릭과 Config의 메뉴 필터링은 연결하지 않았다.

- [현재 사용자 설정의 HOME](579x349.png), [분리 전](before-579x349.png)
- [미구현 메뉴의 빈 영역](empty-view.png)
- [데스크톱](1280x800.png), [모바일 왼쪽](375x812.png), [오른쪽](375x812-right.png)
- [원본 문구로 확인한 HOME](reference-579x349.png)
- [구조 검사 결과](results.json), [Config 회귀 검사](config-check/config-results.json)

Chromium DPR 1의 세 viewport에서 현재 사용자 설정의 첫 HOME 캡처는 분리 전 캡처와 파일 내용이 일치한다. 참고 문구를 적용한 초기 화면도 작업 7 캡처와 일치한다. 사용자 Config는 수정하지 않았으며 전후 SHA-256은 `ece99d07e1b9553c231cb4629e3a3b68d5643960ce2c5098b40ffc40e9fad02c`다.

여덟 빈 화면의 양쪽 영역 비우기와 스크롤바 숨김, HOME 복귀 시 Config 적용·중복 없음, 공통 프레임·고리·탭·패널 DOM 유지, 왼쪽/본문 독립 표시, 잘못된 ID와 잘못된 fragment 반환 시 기존 화면 유지, 외부 요청·로딩 오류 없음, 모바일 가로 이동 204px를 확인했다. Config 문구의 HTML 실행 방지도 회귀 검사했다. 캡처를 열어 HOME과 빈 영역을 육안 확인했다.

반복 교체 뒤 캡처에서는 변경하지 않은 프레임 상단의 안티앨리어싱 픽셀 네 곳이 최대 RGB 3만큼 달라졌다. 재실행 중 글자 경계의 소수 픽셀 차이도 관찰돼 반복 재그리기 비교는 최대 20픽셀·채널 차이 64 이하로 제한한다. 초기 HOME 전후 비교는 이 허용치를 쓰지 않고 완전 일치를 검사한다. 정확한 차이 좌표는 `results.json`의 `repaintPixels`에 남겼다.

## 확인된 기존 제한

현재 Config의 세 글자 이름은 우측 관계 표시의 고정 너비를 넘는다. 이 문제는 분리 전 캡처에도 있으며 이번 단계에서 설정이나 외형을 임의로 변경하지 않았다. `existingTextOverflow`에 기록했고 4번의 긴 문구 처리 기준에 포함해야 한다. 따라서 사용자 설정에 대해 모든 문구의 영역 초과가 없다고 판정한 것은 아니다.

이제 HOME 내용이 JavaScript 화면 파일에 있으므로 스크립트가 꺼지거나 누락되면 공통 외형만 표시된다. 실행 파일 묶음에 `content.js`와 `views/`를 포함해야 한다. 화면별 내용과 실제 메뉴 동작은 구분된다.

## 재검증

```sh
node scripts/verify-structure.mjs /path/to/playwright/index.mjs
node scripts/verify-config.mjs /path/to/playwright/index.mjs docs/verification/structure-step2/config-check
```

구조 검사는 작업 전 저장한 사용자 Config 화면을 비교 기준으로 사용하므로 이후 Config를 바꾸면 전후 일치 검사가 실패할 수 있다. Config 동작 검사는 임시 파일 묶음으로 실행하며 실제 설정은 변경하지 않는다. 1번 Config 검사의 오래된 저장 캡처 비교는 제거하고 이번 단계의 실제 브라우저 캡처 비교로 대체했다.
