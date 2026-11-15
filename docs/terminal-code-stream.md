# 하단 터미널 소스 코드 스트리밍 시스템 명세서

## 1. 개요
트리 하단에 배치된 장식용 터미널 인터페이스의 스크롤 품질과 시각적 현실감을 개선하기 위해 구축한 실시간 소스 코드 스트리밍 컴포넌트입니다.

기존에는 12개 라인의 가상 코드 중 5개 줄만을 350ms 간격의 상태 변경(`setInterval`)으로 교체하여 화면이 덜컹거리며 튀는 현상이 있었습니다. 이를 개선하여 현재 프로젝트의 실제 렌더러 소스 코드 원본(`app/tree.tsx`) 198개 라인을 로드하고, GPU 하드웨어 가속 기반의 무한 선형 스크롤(Continuous Linear Marquee)과 경량 토크나이저를 통한 구문 강조(Syntax Highlighting)를 적용했습니다.

---

## 2. 시스템 아키텍처 및 데이터 흐름

```
[app/tree.tsx 원본 소스]
          │
          ▼
 [lib/source-tree.ts] ─── 198개 라인 원본 문자열 배열
          │
          ▼
 [app/code-stream.tsx] ─── 경량 정규식 토크나이저 (키워드/타입/문자열/숫자/주석 파싱)
          │
          ├── 블록 A (1 ~ 198 라인)
          └── 블록 B (1 ~ 198 라인, seamless 복제 트랙)
          │
          ▼
 [app/globals.css] ────── @keyframes smooth-code-scroll (translateY(0) → translateY(-50%))
                          - 85초 주기 무한 루프
                          - 마우스 호버 시 일시정지 (animation-play-state: paused)
                          - 상단/하단 14% 페이드 마스크 적용
```

---

## 3. 핵심 구성 요소

### A. 소스 데이터셋 ([lib/source-tree.ts](file:///home/krazyeom/dev/christmasTree/lib/source-tree.ts))
실제 3D ASCII 크리스마스 트리를 수학적으로 계산하고 캔버스에 투영하는 `app/tree.tsx`의 전체 198개 라인을 불변 배열(`treeSourceCode`)로 내보냅니다. 클라이언트 사이드 파일 시스템 접근 없이 빌드 번들에 바로 포함되어 즉각 렌더링됩니다.

### B. 스트리밍 컴포넌트 ([app/code-stream.tsx](file:///home/krazyeom/dev/christmasTree/app/code-stream.tsx))
* **토크나이저 (`tokenizeTokens`)**: 정규식을 사용하여 TypeScript/JavaScript 주요 키워드(`const`, `function`, `return` 등), 내장 객체(`Math`, `Array`, `ResizeObserver`), 문자열 리터럴, 주석, 숫자를 구분하여 적절한 색상 클래스로 래핑합니다.
* **메모이제이션 (`useMemo`)**: 198개 라인의 JSX 엘리먼트를 컴포넌트 마운트 시 1회만 생성하여 상위 상태 변경 시에도 불필요한 재계산이 발생하지 않도록 격리했습니다.
* **2중 트랙 구조**: 블록 A와 블록 B를 수직으로 연속 배치하여, 트랙의 50% 이동 지점에서 블록 A의 끝과 블록 B의 시작이 정확히 일치하도록 구성했습니다.

### C. 스타일 및 애니메이션 ([app/globals.css](file:///home/krazyeom/dev/christmasTree/app/globals.css))
* **하드웨어 가속**: `will-change: transform`과 `translateY` 속성을 활용하여 브라우저의 레이아웃 리플로우(Reflow) 없이 컴포지터 스레드에서만 60/120fps 부드러운 스크롤을 유지합니다.
* **사용자 상호작용**: 사용자가 마우스를 올리면 `animation-play-state: paused`가 적용되어 지나가는 소스 코드를 멈춰 두고 읽을 수 있습니다.
* **접근성 및 반응형**: 모바일 화면(640px 이하)에서는 줄 높이(16px)와 컨테이너 높이(72px)가 최적화되며, 시스템의 모션 감소(`prefers-reduced-motion`) 또는 사이트 일시정지 모드와 즉시 연동됩니다.

---

## 4. 컴포넌트 인터페이스

```typescript
interface CodeStreamProps {
  motion: boolean;      // 애니메이션 동작 여부
  styleLabel: string;   // 현재 선택된 트리 스타일 레이블 (예: "CLASSIC / Garlands")
  styleName: string;    // 스타일 한글명 (예: "클래식")
}
```
