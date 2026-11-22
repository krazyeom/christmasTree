# 업무 일지: WebGL2 10만 GPU 파티클 눈송이 및 MediaPipe 손가락 제스처 연동

- **일자**: 2026-11-22
- **작업자**: krazyeom
- **프로젝트**: Christmas Tree (ASCII 3D Wonderland)
- **주요 작업**: 기존 3D ASCII 트리를 보존한 상태에서 WebGL2 기반 10만 파티클 눈송이 오버레이 시스템 구축, MediaPipe Hand Landmarker 기반 온디바이스 손가락/핀치 인터랙션 및 마우스/터치 대체 폴백 구현

---

## 1. 작업 개요 및 배경

Instagram 릴스에서 화제가 된 인터랙티브 웹캠 손가락 트래킹 눈송이 효과를 기존 ASCII 크리스마스 트리에 유기적으로 결합했습니다. 기존 Canvas2D 기반 회전 및 애플 모핑 애니메이션을 일절 훼손하지 않으면서, WebGL2 Transform Feedback을 활용한 고성능 GPU 파티클 눈송이 오버레이를 얹었습니다. 웹캠을 통한 온디바이스 손가락 제스처(검지 추적, 엄지-검지 핀치 소용돌이)와 함께, 웹캠이 없는 환경을 고려한 마우스/터치 드래그 폴백을 완비했습니다.

---

## 2. 주요 구현 내역

### A. WebGL2 Transform Feedback GPU 파티클 렌더러 ([app/snow-webgl2.tsx](file:///home/krazyeom/dev/christmasTree/app/snow-webgl2.tsx))
- VAO/VBO 더블 버퍼링 기법을 적용하여 CPU 개입 없이 GPU 내부에서 100,000개 파티클의 물리 연산과 상태를 직접 갱신.
- 화면 폭 및 기기 사양에 따라 파티클 밀도를 유연하게 적응 (데스크톱 100k, 모바일 28k, reduced-motion 12k).
- 핀치 시 강력한 인력과 회전력을 결합한 나선형 소용돌이(Vortex) 블랙홀 효과 및 손 이동 시 바람 돌풍 효과를 GLSL 300 es 셰이더로 연산.
- 가산 혼합(Additive Blending)을 적용하여 테마 색상(클래식 민트, 샴페인 골드, 오로라 바이올렛)에 맞춰 눈송이 코어와 헤일로가 조화롭게 발광하도록 연출.
- WebGL2를 지원하지 않는 브라우저에서는 기존 2D ASCII 눈송이가 자동으로 출력되도록 안전 대체 로직 구성.

### B. 온디바이스 손가락 추적 서비스 ([lib/hand-tracker.ts](file:///home/krazyeom/dev/christmasTree/lib/hand-tracker.ts))
- Google MediaPipe Hand Landmarker 로컬 태스크 모델(`public/mediapipe/hand_landmarker.task`, 7.5MB)과 WASM 바이너리를 로컬 정적 경로로 배치하여 완전한 온디바이스 연산 수행.
- 카메라 권한 요청 및 비동기 모델 로딩 도중 발생할 수 있는 경쟁 상태(Race Condition)를 해결하기 위해 세대 토큰(`genToken`) 제어 로직 적용.
- 기능 종료나 페이지 이동 시 `mediaStream.getTracks().forEach(t => t.stop())`를 호출하여 카메라 스트림을 즉각 중단하고 비디오 리소스를 완전 반환.
- 엄지 끝과 검지 끝 간의 3D 거리를 실시간 산출하여 핀치 제스처를 판별하고, 손끝 속도 벡터를 스무딩 필터링하여 눈송이에 물리력 전달.

### C. Picture-in-Picture 컨트롤 패널 ([app/hand-camera-pip.tsx](file:///home/krazyeom/dev/christmasTree/app/hand-camera-pip.tsx))
- 플로팅 글래스모피즘 카드로 웹캠 미러링 프리뷰와 손 관절 스켈레톤(21개 랜드마크)을 실시간 오버레이.
- 핀치 인식 시 골드/레드 발광 강조 및 안내 문구 노출.
- 컨트롤 버튼 클릭 시 상위 씬의 클릭 이벤트 전파를 차단(`e.stopPropagation()`)하여 불필요한 캐럴 재생과의 간섭 차단.

### D. 통합 연동 및 UI 보강 ([app/page.tsx](file:///home/krazyeom/dev/christmasTree/app/page.tsx), [app/tree.tsx](file:///home/krazyeom/dev/christmasTree/app/tree.tsx), [app/globals.css](file:///home/krazyeom/dev/christmasTree/app/globals.css))
- 상단 헤더 및 하단 툴바에 손인식 온/오프 토글 버튼 배치.
- 씬 영역에서 마우스 클릭 및 터치 드래그 시 포인터 위치를 손끝 좌표로 연동하고 드래그 다운 상태를 핀치로 매핑.
- 텔레메트리 영역에 `renderer WebGL2 GPU Snow (100k) / ASCII` 실시간 상태 표기.

---

## 3. 보안 및 개인정보 준수 사항

1. **로컬 온디바이스 추적**: 사용자 웹캠 영상은 브라우저 메모리 안에서만 처리되며 외부 서버로 절대 전송되지 않습니다.
2. **명시적 권한 동의**: 사용자가 직접 토글 버튼을 누르기 전까지는 카메라 장치에 접근하지 않습니다.
3. **자원 해제 검증**: 기능 정지 시 비디오 트랙과 애니메이션 프레임 루프가 즉각 중단됩니다.
4. **보안 출처 요구**: 웹캠 기능은 브라우저 규정에 따라 `localhost` 또는 `https://` 환경에서만 활성화됩니다.

---

## 4. 검증 결과

- **정적 타입 검사**: `npm run typecheck` 통과.
- **자동화 테스트**: `npm test` 통과 (4개 항목 전원 정상).
- **프로덕션 빌드**: `npm run build` 성공 (Turbopack 빌드 정상).
- **PM2 런타임**: `http://localhost:37044` 구동 및 무중단 서빙 검증 완료.
