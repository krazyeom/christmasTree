# 오디오 즉시 재생 및 브라우저 오토플레이 언락 명세서

## 1. 개요
브라우저 환경에서 페이지 로드 시 크리스마스 캐럴 오르골 음악이 지연 없이 즉각 시작되도록 보장하는 Web Audio API 최적화 명세서입니다.

최신 웹 브라우저(Chrome, Safari, Firefox 등)는 사용자 제스처 없는 오디오 자동 재생을 기본적으로 제한(`suspended`)합니다. 이를 해결하기 위해 첫 마운트 즉시 무지연 실행 시도와 함께, 첫 상호작용 제스처(포인터/터치/마우스다운/키보드) 발생 시 0ms로 오디오 컨텍스트를 활성화하는 2단계 자동 시작 파이프라인을 구축했습니다.

---

## 2. 2단계 오디오 시작 파이프라인

```
[페이지 로드 (마운트)]
       │
       ▼
 [1단계: 즉시 자동 재생 시도]
       ├── 브라우저 허용 환경 (로컬호스트 / 이전 방문 / MEI 충족)
       │      └─► running 전환 → 즉시 첫 마디 캐럴 연주 시작
       │
       └── 브라우저 보안 제한 환경 (suspended 유지, 60ms 타임아웃 방어)
              │
              ▼
       [2단계: 첫 제스처 0ms 즉각 언락]
              - window 이벤트 리스너: pointerdown, touchstart, mousedown, keydown
              - 인스턴스 재생성 없이 기존 AudioContext.resume() 직접 호출
              - 사용자가 화면을 탭하거나 스크롤하는 첫 찰나에 즉각 소리 출력
```

---

## 3. 핵심 변경 사항

### A. MusicBox 오디오 엔진 ([lib/music.ts](file:///home/krazyeom/dev/christmasTree/lib/music.ts))
* **700ms 블로킹 타임아웃 제거**: 기존에 `ctx.resume()` 대기에 걸려 있던 700ms 딜레이를 60ms로 단축하여, 첫 마운트 시 브라우저 오디오 상태 판정이 즉각 완료되도록 개선했습니다.
* **`resume()` 메서드 신설**: 인스턴스를 파괴하고 다시 생성하지 않고도, 사용자 제스처 이벤트 내에서 기존 컨텍스트를 즉시 `running`으로 깨워 첫 음을 즉각 발성하도록 최적화했습니다.
* **WebKit 호환성 강화**: iOS Safari 및 구형 WebKit 환경을 위한 `webkitAudioContext` 폴백을 지원합니다.

### B. 사용자 인터랙션 캡처 ([app/page.tsx](file:///home/krazyeom/dev/christmasTree/app/page.tsx))
* `click` 이벤트 발생(마우스를 뗐을 때)까지 기다리지 않고, 마우스나 손가락이 닿는 첫 순간(`pointerdown`, `touchstart`, `mousedown`)에 이벤트 컨텍스트 내에서 동기식으로 오디오를 언락합니다.
* 자동 재생 대기 상태(`autoplayPending`)일 때 하단 플레이어 버튼에 은은한 펄스 효과(`pulse`)를 부여하여 사용자의 직관적인 조작을 돕습니다.
