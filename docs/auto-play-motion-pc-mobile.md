# PC 및 모바일 환경 자동 애니메이션 즉시 재생 보장 명세서

## 1. 개요
일부 PC 브라우저 및 운영체제(OS) 환경에서 시스템 접근성 설정(`prefers-reduced-motion`)이 활성화되어 있을 때, 페이지 진입 시 크리스마스 트리 애니메이션이 자동으로 재생되지 않고 멈춰있던 원인을 규명하고, PC와 모바일 모든 환경에서 첫 시작 시 100% 무조건 애니메이션이 자동 재생되도록 구조를 개편했습니다.

---

## 2. 문제 원인 및 해결 조치

### A. OS `prefers-reduced-motion` 자동 감지로 인한 모션 중단 차단 ([app/page.tsx](file:///home/krazyeom/dev/christmasTree/app/page.tsx))
* **문제점**: 페이지 초기화 시 `window.matchMedia('(prefers-reduced-motion: reduce)')`를 감지하여 OS에 창 애니메이션 억제 설정이 있는 경우 `motion` 상태를 `false`로 덮어쓰던 코드로 인해 PC에서 트리가 멈춰있었습니다.
* **해결책**:
  - 해당 이벤트 리스너를 완전히 제거하고 초기 `motion` 상태를 `true`로 기본 고정했습니다.
  - 사용자가 하단 툴바의 일시정지(`Ⅱ`) / 재생(`▷`) 버튼을 능동적으로 눌렀을 때만 애니메이션 상태가 제어되도록 사용자 명시적 제어 우선 구조로 변경했습니다.

### B. 전역 CSS 애니메이션 강제 중단 룰 제거 ([app/globals.css](file:///home/krazyeom/dev/christmasTree/app/globals.css))
* `@media(prefers-reduced-motion:reduce)`에 걸려 있던 `animation: none !important` 룰을 제거하여 코드 스트림 터미널 스크롤, 펄스 글로우 등 전체 UI 애니메이션이 온전히 렌더링되도록 복원했습니다.

### C. 캔버스 프레임 렌더러 안전 보정 ([app/tree.tsx](file:///home/krazyeom/dev/christmasTree/app/tree.tsx))
* `draw` 렌더링 루프 진입 시 캔버스 폭이나 높이가 일시적으로 0으로 측정되는 레이아웃 지연 현상을 방지하기 위해 `if (w === 0 || h === 0) resize();` 보정 루틴을 추가했습니다.
* 첫 프레임 진입 시 `previous`가 0일 때도 16ms(0.016s)의 기준 델타 타임을 즉시 부여하여 첫 프레임부터 회전 및 성장이 오차 없이 시작되도록 조치했습니다.
