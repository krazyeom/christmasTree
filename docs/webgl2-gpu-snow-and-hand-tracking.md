# WebGL2 GPU 파티클 눈송이 및 웹캠 손가락 인식 인터랙션 명세서

## 1. 개요

기존 Canvas2D 기반 ASCII 트리의 시각적 정체성을 해치지 않으면서, GPU 가속 기반 10만(100k) 파티클 눈송이 오버레이와 MediaPipe Hand Landmarker 기반 온디바이스 손가락 제스처 인식을 구축했습니다. 사용자의 카메라 접근 동의 하에 손가락 끝 위치와 핀치(Pinch) 제스처를 실시간 감지하여 눈송이 소용돌이와 돌풍 효과를 구현하며, 웹캠이 없는 환경에서도 마우스 및 터치 드래그로 동일한 인터랙션을 제공합니다.

---

## 2. 아키텍처 및 핵심 구성요소

### A. WebGL2 Transform Feedback 파티클 엔진 ([app/snow-webgl2.tsx](file:///home/krazyeom/dev/christmasTree/app/snow-webgl2.tsx))
* **더블 버퍼링 (Ping-Pong Architecture)**:
  - VAO A와 VAO B를 번갈아 교체하며 GPU 내에서 파티클 상태(위치 `vec3`, 속도 `vec3`, 메타데이터 `vec4`)를 직접 갱신합니다.
  - CPU-GPU 간 데이터 전송 병목 없이 데스크톱 기준 100,000개 파티클을 60fps로 실시간 시뮬레이션합니다.
* **기기 및 접근성 적응형 밀도**:
  - 데스크톱: 100,000 파티클
  - 모바일(화면 폭 768px 이하): 28,000 파티클
  - 접근성 `prefers-reduced-motion` 활성화 환경: 12,000 파티클로 축소 및 과도한 소용돌이 억제
  - 애니메이션 일시정지(`motion: false`): `requestAnimationFrame` 연산과 Transform Feedback 기록을 완전히 멈추어 불필요한 GPU 자원 소모를 방지합니다.
* **물리 시뮬레이션 (GLSL 300 es)**:
  - 기본 중력 하강 및 삼각함수 기반 가로 바람 진동 적용.
  - **핀치(Pinch) 소용돌이**: 엄지와 검지를 모았을 때 손끝 좌표를 중심으로 강한 인력(Attraction)과 접선 방향 회전력(Vortex)을 부여하여 눈보라가 손가락 끝으로 빨려 들어가는 블랙홀 효과 생성.
  - **손바닥 이동 및 돌풍**: 손이 빠르게 움직일 때 손의 가속도 벡터를 파티클에 전파하여 눈송이를 쓸어내는 효과 부여.
* **WebGL2 미지원 환경 자동 대체 (Fallback)**:
  - 브라우저나 디바이스에서 WebGL2 컨텍스트 생성을 지원하지 않는 경우, 기존 Canvas2D ASCII 눈송이(`+`, `.`) 렌더링을 자동으로 유지하여 빈 화면 노출을 차단합니다.

### B. 온디바이스 손가락 추적 서비스 ([lib/hand-tracker.ts](file:///home/krazyeom/dev/christmasTree/lib/hand-tracker.ts))
* **MediaPipe Hand Landmarker 로컬 구동**:
  - 외부 CDN 원격 스크립트 실행 대신 로컬 정적 에셋 경로(`public/mediapipe/wasm/`, `public/mediapipe/hand_landmarker.task`)를 직접 로드하여 사용합니다.
  - 영상 프레임을 브라우저 내부 메모리에서만 분석(100% On-Device)하며, 외부 네트워크로 어떠한 영상이나 좌표 데이터도 전송하지 않습니다.
* **비동기 초기화 레이스 방지 (Generation Token)**:
  - 사용자가 카메라 토글을 빠르게 반복 클릭할 때 이전 요청의 카메라 스트림이나 WASM 인스턴스가 뒤늦게 실행되지 않도록 세대 토큰(`genToken`)을 검증하여 이전 비동기 작업을 안전하게 무효화합니다.
* **철저한 하드웨어 자원 해제**:
  - 기능 끄기 또는 컴포넌트 언마운트 시 `stream.getTracks().forEach(t => t.stop())`를 즉시 호출하여 카메라 하드웨어 점유를 완전히 해제합니다.
* **제스처 판별 알고리즘**:
  - 검지 끝(랜드마크 8)과 엄지 끝(랜드마크 4) 사이의 3차원 유클리드 거리를 계산하여 0.075 이하일 때 핀치(`isPinching: true`)로 판정합니다.
  - 사용자 편의를 위해 웹캠 뷰의 수평 축을 반전(좌우 미러링) 처리하여 거울을 보듯 직관적으로 조작할 수 있습니다.

### C. Picture-in-Picture 미리보기 위젯 ([app/hand-camera-pip.tsx](file:///home/krazyeom/dev/christmasTree/app/hand-camera-pip.tsx))
* 화면 우측 하단에 위치하는 미니 플로팅 패널로 실시간 미러링 영상과 21개 손 관절 스켈레톤 및 발광 포인트를 시각화합니다.
* 핀치 감지 시 골드/레드 발광 효과와 함께 상태 텍스트(`✨ PINCH 소용돌이`)를 제공합니다.
* 패널 최소화/닫기 버튼 클릭 시 이벤트 버블링을 차단(`e.stopPropagation()`)하여 씬 클릭 캐럴 재생 트리거와의 간섭을 방지합니다.

### D. 포인터 및 터치 대체 인터랙션 ([app/page.tsx](file:///home/krazyeom/dev/christmasTree/app/page.tsx))
* 웹캠이 없거나 권한을 허용하지 않은 환경에서도 씬 영역에서 마우스 클릭 및 터치 드래그 동작 시 포인터 좌표를 손끝 위치로 매핑하고, 마우스 다운(Down) 상태를 핀치 상태로 연동하여 동일한 눈송이 소용돌이를 체험할 수 있습니다.

---

## 3. 검증 결과

1. **정적 타입 검사**: `npm run typecheck` 통과 (0 오류).
2. **단위 및 통합 테스트**: `npm test` (`tests/snow-webgl2-and-tracker.test.mjs`) 4개 항목 전원 통과.
   - 로컬 MediaPipe 모델 파일 및 WASM 바이너리 유효성 검증
   - HTTP 서버(`${PORT}`)의 앱 페이지, 태스크 모델, WASM 정적 제공 및 `application/wasm` 헤더 검증
   - 핀치 유클리드 거리 및 임계값 수학 검증
   - 파티클 경계 리사이클 로직 검증
3. **프로덕션 빌드 및 런타임**:
   - `npm run build` 성공 (Turbopack 빌드 정상 완료).
   - PM2 프로젝트 로컬 데몬 구동 (`http://localhost:37044`) 정상 확인.
