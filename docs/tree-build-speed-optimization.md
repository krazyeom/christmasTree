# 크리스마스 트리 하단 성장(Build) 속도 최적화 명세서

## 1. 개요
사용자 피드백을 반영하여 크리스마스 트리가 밑에서부터 위로 솟아오르는 생성(Build) 애니메이션 소요 시간을 기존 5초에서 **2.4초**로 약 2.1배 고속화하고, 전체 시각 요소의 타이밍을 리드미컬하게 재동기화했습니다.

---

## 2. 세부 변경 내역

### A. 설정 파라미터 최적화 ([lib/config.ts](file:///home/krazyeom/dev/christmasTree/lib/config.ts))
* `treeBuildSeconds`: 기존 `5`초 $\rightarrow$ **`2.4`초**
* `greetingAppearsAfterSeconds`: 기존 `3`초 $\rightarrow$ **`2.2`초**
* 트리가 바닥에서부터 나뭇가지를 뻗으며 정상 높이까지 차오르는 시간이 약 2배 이상 빨라져, 첫 접속 및 리플레이 시 경쾌하고 생동감 넘치는 연출을 제공합니다.

### B. 캔버스 렌더러 시각 요소 타이밍 재동기화 ([app/tree.tsx](file:///home/krazyeom/dev/christmasTree/app/tree.tsx))
1. **일반 테마 (`classic`, `ribbon`, `pixel`, `stars`, `matrix`, `circuit`)**:
   - 트리 나뭇가지 성장: $0 \le t \le 2.4$초
   - 트리 줄기 및 밑둥(`trunkAlpha`): $t \ge 1.1$초부터 페이드인 (기존 3.0초)
   - 바닥 선물 상자(`giftAlpha`): $t \ge 1.2$초부터 페이드인 (기존 2.8초)
   - 떠오르는 선물 상자 파티클(`burstAlpha`): $t \ge 1.5$초부터 분출 (기존 3.4초)
   - 산타 썰매 비행(`flight`): $t \ge 1.6$초부터 활성화 (기존 3.2초)
   - 상단 꼭대기 황금 별(`topperAlpha`): $t \ge 1.8$초부터 찬란하게 페이드인 (기존 2.5초)
   - 하단 크리스마스 인사 문구: $t \ge 2.2$초부터 점등 (기존 3.8초)
2. **애플 테마 (`apple`)**:
   - 애플 로고 펄싱 및 은하수 흩어짐(Scatter & Swirl) 모핑 시간도 기존 2.6초에서 **1.8초**로 단축하여 다이내믹한 템포 유지.
