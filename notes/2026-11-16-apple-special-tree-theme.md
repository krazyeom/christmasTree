# 업무 일지:  애플 독립 스페셜 테마 분리 및 조건부 로고 렌더링 개편

- **일자**: 2026-11-16
- **작업자**: krazyeom
- **프로젝트**: Christmas Tree (ASCII 3D Wonderland)
- **주요 작업**:  애플 로고 인트로 모핑 및 상단 사과 토퍼를 독립 스페셜 테마(`apple`) 전용으로 격리 분리

---

## 1. 작업 개요
사용자 요청에 따라 모든 트리에 일괄 적용되던 시작 시 애플 로고 모핑과 상단 사과 토퍼를 분리하여, 신규 독립 스타일인 ` 애플` 테마에서만 선택적으로 나타나도록 아키텍처를 개편하였습니다.

---

## 2. 주요 구현 및 변경 내역

### A. 트리 스타일 레지스트리 확장 ([lib/tree-styles.ts](file:///home/krazyeom/dev/christmasTree/lib/tree-styles.ts))
- 7번째 독립 스타일인 `{ id: 'apple', name: '애플', icon: '', label: 'apple.ts', description: '한입 베어문 애플 로고에서 점들이 흩어져 피어나는 스페셜 트리' }`를 추가 등록.

### B. 캔버스 렌더러 분기 격리 ([app/tree.tsx](file:///home/krazyeom/dev/christmasTree/app/tree.tsx))
- `isAppleStyle = variant === 'apple';` 플래그를 도입.
- **애플 테마**: 시작 시 중앙  애플 로고 인트로 펄싱 $\rightarrow$ 은하수 소용돌이 흩어짐 모핑 $\rightarrow$ 상단 한입 베어문  사과 토퍼(빨간 사과 / 하얀 사과) 렌더링.
- **일반 테마(클래식, 리본, 8-bit, 별자리, 매트릭스, 회로)**: 애플 로고 모핑을 완전히 생략하고 부드러운 나뭇가지 성장 애니메이션 유지, 상단 꼭대기 장식도 기존 클래식 `★ 황금 별`로만 고정 렌더링.

### C. UI 컨트롤 조건부 노출 ([app/page.tsx](file:///home/krazyeom/dev/christmasTree/app/page.tsx), [app/globals.css](file:///home/krazyeom/dev/christmasTree/app/globals.css))
- 상단 스테이지 바의 ` 모핑` 버튼과 `🍎 사과 토퍼` 배지는 `variant === 'apple'`일 때만 표시되도록 조건부 렌더링.
- 하단 툴바의 `topper-toggle-group` 및 ` 애플` 모핑 버튼 역시 애플 테마에서만 노출.
- 스타일 피커 레이아웃을 7열 그리드로 정돈.

### D. 터미널 코드 스트리밍 동기화 ([lib/source-tree.ts](file:///home/krazyeom/dev/christmasTree/lib/source-tree.ts))
- 최신 `tree.tsx` 716라인 코드로 터미널 스트리밍 데이터를 완전 동기화.

---

## 3. 검증 및 배포
1. **TypeScript 및 정적 빌드**: `npm run build` 성공 (0 오류).
2. **PM2 데몬 재시작**: `http://localhost:37044` 무중단 갱신 완료.
3. **HTTP 렌더링 검증**: 기본 접속 시 클래식 트리 상태에서 상단/툴바에 사과 로고가 일절 노출되지 않으며, 스타일 피커에 ` 애플`이 정상 노출됨을 확인.
