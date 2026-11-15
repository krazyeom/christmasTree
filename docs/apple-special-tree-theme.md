#  애플(Apple) 독립 스페셜 테마 및 조건부 로고 렌더링 명세서

## 1. 개요
기존 모든 트리에 전역으로 적용되던 애플 로고 인트로 모핑 및 상단 사과 토퍼를 분리하여, **독립된 전용 트리 스타일인 ` 애플 (apple.ts)`**에서만 선택적으로 작동하도록 시스템을 개편했습니다.

---

## 2. 테마 분리 및 조건부 렌더링 아키텍처

### A. 트리 스타일 정의 확장 ([lib/tree-styles.ts](file:///home/krazyeom/dev/christmasTree/lib/tree-styles.ts))
* 7번째 독립 스타일로 `apple`을 공식 등록했습니다:
  - `id`: `'apple'`
  - `name`: `'애플'`
  - `icon`: `''`
  - `label`: `'apple.ts'`
  - `description`: `'한입 베어문 애플 로고에서 점들이 흩어져 피어나는 스페셜 트리'`

### B. 캔버스 렌더러 조건부 제어 ([app/tree.tsx](file:///home/krazyeom/dev/christmasTree/app/tree.tsx))
1. **애플 테마 (`variant === 'apple'`)**:
   - **시작 인트로**: 화면 중앙에  애플 로고가 펄싱하며 떠오르고, 인트로 텍스트(` APPLE HOLIDAY EDITION`)가 점등된 후 수천 개의 점들이 은하수처럼 사방으로 흩어지며(Scatter & Swirl) 트리가 완성되는 모핑 트랜지션 실행.
   - **상단 꼭대기 장식**: 한입 베어문  사과 토퍼(빨간 사과 / 하얀 사과)가 눈부신 오라와 함께 렌더링.
2. **일반 테마 (`classic`, `ribbon`, `pixel`, `stars`, `matrix`, `circuit`)**:
   - **시작 인트로**: 애플 로고 모핑이 실행되지 않으며, 트리 본연의 아래서부터 자연스럽게 나뭇가지가 자라나는 클래식 빌드 애니메이션 유지.
   - **상단 꼭대기 장식**:  사과 로고 대신 오직 클래식 **`★ 황금 별`**만 렌더링.

### C. UI 인터페이스 분기 처리 ([app/page.tsx](file:///home/krazyeom/dev/christmasTree/app/page.tsx), [app/globals.css](file:///home/krazyeom/dev/christmasTree/app/globals.css))
* **상단 스테이지 바 우측**: `variant === 'apple'`일 때만 `🍎 빨간사과 / 🍏 하얀사과` 토글 배지와 ` 모핑` 버튼이 노출되며, 일반 테마에서는 숨김 처리되어 정갈한 헤더를 유지합니다.
* **하단 툴바**: `variant === 'apple'`일 때만 토퍼 선택기(`topper-toggle-group`) 및 ` 모핑` 리플레이 버튼이 나타납니다.
* **스타일 피커 그리드**: 7개 테마 버튼이 고르게 정렬되도록 CSS 그리드를 7열(`repeat(7, 1fr)`)로 최적화했습니다.
