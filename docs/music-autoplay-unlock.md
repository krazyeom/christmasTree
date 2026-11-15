# 오디오 즉시 재생 및 브라우저 오토플레이 언락 명세서

## 1. 개요
브라우저 환경에서 페이지 로드 시 크리스마스 캐럴 오르골 음악이 지연 없이 즉각 시작되도록 보장하고, 하단 컨트롤까지 스크롤하지 않고도 화면 어디서나 직관적으로 오디오를 활성화할 수 있도록 구성한 Web Audio API 및 인터랙션 최적화 명세서입니다.

최신 웹 브라우저(Chrome, Safari, Firefox 등)는 사용자 제스처 없는 소리 있는 오디오 자동 재생을 엄격하게 제한(`suspended`)합니다. 이를 해결하기 위해 W3C Autoplay 정책의 핵심인 **동기 콜스택(Synchronous Call Stack) 내 `AudioContext.resume()` 호출**과 **트리 영역/상단 바 퀵 토글**을 결합하여, 사용자가 하단 플레이어 버튼을 찾아다닐 필요 없이 화면 어디를 탭하든 즉각 음악이 울려 퍼지도록 설계했습니다.

---

## 2. 3계층 오디오 시작 아키텍처

```
[페이지 로드 (마운트)]
       │
       ▼
 [1계층: 백그라운드 자동 기동 시도]
       ├── 브라우저 허용 환경 (로컬호스트 / 이전 방문 이력 / MEI 충족)
       │      └─► running 전환 → 진입 즉시 첫 마디 캐럴 연주 시작
       │
       └── 브라우저 보안 제한 환경 (suspended 유지, 60ms 타임아웃 방어)
              │
              ├── [2계층: 화면 전체 동기 제스처 캡처링 (Capture: true)]
              │      - document 전역 캡처 리스너: pointerdown, click, touchstart, keydown
              │      - async 지연 없는 순수 동기 콜스택에서 ctx.resume() 호출
              │      - 화면 어디든 살짝 터치하거나 스크롤하는 첫 순간 0ms로 소리 출력
              │
              └── [3계층: 시각적 퀵 인터랙션 UI]
                     - 스테이지 상단 퀵 버튼 (`♪ 캐럴 켜기`)
                     - 트리 캔버스 클릭 시 파티클 폭발과 함께 음악 즉각 시작
                     - 트리 중앙 힌트 배너 (`♪ 화면을 클릭하면 크리스마스 캐럴이 시작돼요`)
```

---

## 3. 핵심 변경 사항

### A. 동기 콜스택 언락 엔진 ([lib/music.ts](file:///home/krazyeom/dev/christmasTree/lib/music.ts))
* **`unlockAndPlay(song?: number)` 신설**:
  기존 `async / await` 비동기 래퍼 내부에서 `resume()`을 호출하던 구조를 개선하여, 이벤트 핸들러의 동기 콜스택에서 `this.ctx.resume()`을 즉각 실행하도록 구현했습니다. 브라우저 엔진이 사용자 제스처 컨텍스트(User Activation)를 온전히 인정하여 100% 언락을 보장합니다.

### B. 퀵 액세스 UI 및 트리 인터랙션 ([app/page.tsx](file:///home/krazyeom/dev/christmasTree/app/page.tsx))
* **상단 바 퀵 버튼 (`stage-top`)**: 화면을 아래로 스크롤하여 징글벨 옆 플레이 버튼을 찾을 필요 없이, 상단 바 좌측에 `♪ 캐럴 켜기` 버튼을 배치했습니다.
* **트리 씬 탭 인터랙션 (`scene`)**: 사용자가 화면 한가운데의 트리를 터치하면 즉시 선물 상자 파티클이 터지며 캐럴이 시작됩니다.
* **안내 힌트 배너 (`scene-hint`)**: 음악이 아직 시작되지 않았을 때 화면 중앙에 플로팅 힌트를 띄워 사용자가 자연스럽게 화면을 터치하도록 유도합니다.

### C. 스타일링 ([app/globals.css](file:///home/krazyeom/dev/christmasTree/app/globals.css))
* `.quick-sound-btn`, `.sound-status-pill`, `.scene-hint` 스타일을 추가하고, 트리 영역에 `cursor: pointer`를 부여했습니다.
