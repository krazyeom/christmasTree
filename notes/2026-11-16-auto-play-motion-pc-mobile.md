# 업무 일지: PC/모바일 전 환경 초기 애니메이션 무조건 자동 재생 보장 조치

- **일자**: 2026-11-16
- **작업자**: krazyeom
- **프로젝트**: Christmas Tree (ASCII 3D Wonderland)
- **주요 작업**: PC 브라우저 환경에서 첫 진입 시 애니메이션이 자동 재생되지 않던 버그 트러블슈팅 및 즉시 자동 시작 보장

---

## 1. 문제 현상
사용자 보고에 따르면 모바일과 달리 PC 환경에서 첫 진입 시 3D 크리스마스 트리 애니메이션이 자동으로 플레이되지 않고 정지해 있는 현상이 발생하였습니다.

---

## 2. 근본 원인 분석
1. **OS 레벨 `prefers-reduced-motion` 자동 차단**:
   - `page.tsx` 내 `useEffect`에서 `matchMedia('(prefers-reduced-motion: reduce)')`를 감지하여, 윈도우나 리눅스 등 데스크탑 OS 성능/접근성 옵션에 의해 `reduce`가 활성화되어 있는 경우 `motion` 상태를 즉시 `false`로 꺼버림.
2. **글로벌 CSS 규칙에 의한 강제 정지**:
   - `globals.css`에 `@media(prefers-reduced-motion:reduce) { * { animation: none !important } }`가 선언되어 있어 CSS 기반 애니메이션까지 일괄 정지됨.

---

## 3. 해결 조치
- **`app/page.tsx`**: OS의 reduced-motion 감지 코드를 완전 제거하고, 항상 `motion: true`로 즉시 자동 재생되도록 고정. 수동 일시정지(`Ⅱ` 버튼)로만 제어 가능.
- **`app/globals.css`**: CSS 강제 정지 미디어 쿼리 삭제.
- **`app/tree.tsx`**: 렌더링 시작 시 레이아웃 0x0 딜레이 방지를 위한 즉각 `resize()` 보강 및 첫 프레임 델타 타임 정상화.
- **`lib/source-tree.ts`**: 최신 소스코드 717개 라인으로 동기화.

---

## 4. 검증 및 배포
1. **TypeScript 및 번들 빌드**: `npm run build` 성공 (0 오류).
2. **PM2 데몬 재시작**: `http://localhost:37044` 무중단 배포 완료.
3. **HTTP 렌더링 검증**: PC/모바일 환경 구분 없이 진입 즉시 60fps 애니메이션 실행 확인.
