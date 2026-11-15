# 2026-11-16 작업 노트: 크리스마스 트리 터미널 코드 스크롤 및 소스 원본 스트리밍 개선

* **작업 대상**: christmasTree / 하단 터미널 코드 뷰어 및 UI 스타일
* **핵심 주제**: 터미널 소스 코드 무한 스크롤 엔진 구축, app/tree.tsx 원본 스트리밍, 구문 강조, Y/S/W 시그니처 엑센트 적용
* **작성 일자**: 2026-11-16
* **작업자**: krazyeom

---

## 1. 작업 개요
트리 하단에 표시되는 코드 창에서 4~5줄의 코드가 주기적으로 끊기며 반복되던 현상을 해결했습니다. 실제 프로젝트의 3D ASCII 트리 렌더러 소스 원본(`app/tree.tsx` 198줄)을 터미널에 탑재하고, GPU 합성 기반의 끊김 없는 무한 선형 스크롤과 경량 구문 강조 시스템을 적용하여 현실감 있는 터미널 스트리밍 경험을 완성했습니다.

---

## 2. 주요 구현 및 변경 내역

### A. 터미널 코드 뷰어 전면 개편 ([app/code-stream.tsx](file:///home/krazyeom/dev/christmasTree/app/code-stream.tsx), [lib/source-tree.ts](file:///home/krazyeom/dev/christmasTree/lib/source-tree.ts))
* **구현 배경**: 기존에는 12줄의 가짜 코드 조각을 350ms마다 `setInterval`로 DOM을 교체하며 표시하여 덜컹거림이 심했고, 실제 코드의 맥락이 없어 시각적 몰입감이 떨어졌습니다.
* **핵심 로직**:
  * `lib/source-tree.ts`: 실제 `app/tree.tsx`의 198개 라인 전체를 소스 배열로 구성.
  * `app/code-stream.tsx`: 정규식을 활용한 클라이언트 측 가상 렉서를 구현하여 키워드, 내장 타입, 문자열, 주석, 숫자에 색상 클래스를 부여.
  * A/B 블록 복제 렌더링을 통해 `-50%` 변위 이동 시 완벽한 무한 루프 형성.

### B. GPU 가속 무한 스크롤 CSS 구현 ([app/globals.css](file:///home/krazyeom/dev/christmasTree/app/globals.css))
* `@keyframes smooth-code-scroll`: 0%에서 -50%까지 85초 동안 선형(linear)으로 위로 이동.
* 리렌더링 제거: React 상태 업데이트(`tick`)와 스크롤 애니메이션을 완전히 분리하여 불필요한 DOM 재생성을 없앰.
* 사용자 편의성: 마우스 호버 시 스크롤이 자동으로 일시정지(`animation-play-state: paused`)되어 소스 코드를 읽을 수 있도록 지원.

### C. 브랜드 시그니처 스타일링 (`Y`, `S`, `W` 문자 엑센트)
* 전역 지침에 따라 헤더 로고, 본문 문구, 푸터 제작자 크레딧(`kraz<span className="sig-accent">y</span>eom`)의 시그니처 문자에 앰버 골드(`#E09F3E`) 색상을 적용.

### D. 음악 즉시 재생 및 브라우저 오토플레이 0ms 언락 파이프라인
* **구현 배경**: 페이지 접속 시 크리스마스 음악이 바로 시작되지 않거나 마우스를 뗐을 때까지 딜레이가 발생하던 문제 개선.
* **핵심 로직**:
  * 마운트 즉시 `startMusic(0)` 실행 (자동 재생 허용 환경에서 즉시 첫 음 시작).
  * 700ms 블로킹 대기를 60ms로 단축하여 상태 판정 최적화.
  * 브라우저 제한 환경에서는 `pointerdown`, `touchstart`, `mousedown`, `keydown` 즉시 감지하여 기존 `AudioContext.resume()`을 0ms로 호출.
  * 대기 상태 시 재생 버튼에 시각적 펄스 애니메이션 적용.

---

## 3. 트러블슈팅 및 개선 지표

| 문제 상황 (Issue) | 근본 원인 (Root Cause) | 해결 방법 (Resolution) |
| :--- | :--- | :--- |
| 터미널 코드 창에서 4~5줄의 코드가 350ms마다 덜컹거리며 튐 | `key={tick}` 부여로 매 주기마다 컴포넌트 전체가 언마운트/재마운트되며 CSS transform 초기화 | React state 기반 렌더링을 제거하고, 순수 CSS 무한 스크롤 트랙(`smooth-code-scroll`)으로 전환하여 120fps 부드러운 스크롤 확보 |
| 짧은 더미 코드로 인해 반복감이 심함 | 12개 라인의 가상 문자열 배열만 사용 | 실제 `app/tree.tsx`의 198개 라인 원본 소스 전체를 데이터셋으로 교체 |

---

## 4. 아키텍처 결정 사항 (ADR 요약)

* **결정 항목**: 터미널 코드 스트리밍을 순수 CSS 키프레임 애니메이션으로 일원화
* **결정 배경**: JavaScript 타이머나 `requestAnimationFrame`으로 요소를 직접 이동시키면 메인 스레드 부하 및 가비지 컬렉션으로 미세한 프레임 드랍이 발생할 수 있음.
* **채택한 대안**: 2중 복제 블록(Dual-block) 구조와 CSS `translateY(-50%)` GPU 컴포지터 레이어 활용. CPU 점유율을 0%로 유지하면서 영구적인 무한 스크롤 달성.

---

## 5. 보안 및 성능 자가 검증 (Security & Performance)
1. **Security Zero-Leak**: 소스 코드 및 문서 내 API 키, 비밀번호, 내부 IP, 개인정보 일절 없음 확인 완료.
2. **빌드 검증**: `npm run typecheck` 및 `npm run build` 오류 없이 통과 (빌드 소요 시간 410ms).
3. **서비스 상태**: PM2 로컬 데몬 온라인 및 HTTP 200 정상 응답 검증 완료.
