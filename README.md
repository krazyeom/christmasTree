# Little Christmas · ASCII Wonderland

Next.js / React / TypeScript로 만든 인터랙티브 ASCII 크리스마스 트리입니다.

- 아래에서 위로 5초 동안 완성되는 회전 트리, 문자로 만든 별과 조명
- 6가지 트리: 클래식 / 나선 리본 / 8-bit / 별자리 / 매트릭스 / 회로 및 애플(Apple) 스페셜 에디션
- WebGL2 GLSL 기반 10만(100k) GPU 파티클 눈송이 오버레이 및 MediaPipe Hand Landmarker 손가락 제스처 인식
  - 손가락 모으기(Pinch): 눈송이가 손끝으로 빠르게 빨려 들어가는 소용돌이(Vortex) 블랙홀 효과
  - 손바닥 이동: 손의 가속도에 맞춰 눈송이를 흩날리는 돌풍(Push Wind) 효과
  - 웹캠이 없거나 권한이 제한된 환경을 위한 마우스 클릭/터치 드래그 포인터 대체 지원
  - WebGL2 미지원 환경 자동 감지 시 기존 2D ASCII 텍스트 눈으로 부드럽게 대체
- 버전별 터미널 코드, 실행 커맨드와 상태를 표현한 개발자 스타일 UI (장식용)
- 눈, 떨어지는 ASCII 선물, 바닥 반사, 3가지 색상 테마
- 3초부터 나타나는 `Happy Christmas LTC` 인사말
- 장식용 JavaScript 코드 스크롤, 모바일 반응형 화면
- 직접 합성한 Jingle Bells / Silent Night / Deck the Halls / Joy to the World 오르골, 음량 조절
- 애니메이션 정지·다시 만들기·전체 화면, reduced-motion 지원

## 실행

Node.js 20.9 이상이 필요합니다.

```sh
npm ci
./scripts/build
./scripts/start
./scripts/stop
```

`npm run build`, `npm start`, `npm stop`도 동일합니다. 개발은 `npm run dev`.

시작할 때 비어 있는 10000–60000 포트를 무작위로 선택하고 `.runtime/port`에 보관합니다. 다음 시작 때 가능하면 같은 포트를 재사용합니다. 실행 결과에 접속 URL이 표시됩니다. `PORT=43210 ./scripts/start`로 지정할 수도 있습니다. PM2가 프로세스를 관리하고 비정상 종료 시 재시작합니다. 프로젝트 전용 PM2 데몬을 사용하므로 stop은 다른 프로젝트의 PM2에 영향을 주지 않습니다. OS 재부팅 자동 시작은 별도 설정하지 않습니다.

```sh
# 현재 포트
cat .runtime/port
# 프로젝트 PM2 상태
PM2_HOME="$PWD/.runtime/pm2" ./node_modules/.bin/pm2 list
```

## 인사말 편집

`lib/config.ts`:

```ts
export const christmasConfig = {
  greeting: 'Happy Christmas',
  recipient: 'LTC', // 원하는 이름이나 문구
  greetingAppearsAfterSeconds: 3,
  treeBuildSeconds: 5,
  rotationSpeed: 0.33, // 초당 회전 속도
  snowCount: 230, // 눈의 개수
  snowSpeed: 3.1, // 눈 속도 배율
  giftSpeed: 2.6, // 선물 속도 배율
  musicSpeed: 1.4, // 캐럴 속도 배율
};
```

변경 후 stop → build → start를 실행합니다. 화면의 **나만의 인사말** 버튼으로 현재 화면에서 즉시 바꿀 수도 있습니다(새로고침하면 기본값으로 돌아옵니다).

## 음악과 출처

외부 녹음, 샘플, 스트리밍 음원은 사용하지 않습니다. 퍼블릭 도메인 원곡의 멜로디를 Web Audio API로 직접 합성한 간단한 오르골 편곡입니다. 페이지가 열리면 음악 자동 재생을 시도합니다. 브라우저가 자동 재생을 제한하면 화면의 첫 클릭·터치 또는 Enter/Space 입력으로 재생합니다. 수동 일시 정지 후에는 다른 곳을 터치해도 다시 시작하지 않습니다.

- Jingle Bells — James Lord Pierpont (1857): [Johns Hopkins 원본 악보 자료](https://levysheetmusic.mse.jhu.edu/collection/062/029)
- Silent Night — Franz Xaver Gruber (1818): [Silent Night Association](https://www.stillenacht.at/en/)
- Deck the Halls — 전통 웨일스 선율
- Joy to the World — Lowell Mason (1836)
- 새로 작성한 합성 편곡/음표 데이터는 이 저장소의 ISC 라이선스로 제공합니다. 오래된 원곡과 현대의 녹음물 권리는 별개입니다.

시각 참고: 사용자가 제공한 Instagram 릴스 스크린샷. 원본 동영상 및 타인의 코드는 포함하지 않습니다.

## 개인정보 및 카메라 접근 정책

분석 도구, 외부 폰트, 외부 이미지 요청, 회원가입을 사용하지 않습니다.

- **온디바이스 손가락 추적**: 웹캠 손가락 제스처 인식은 사용자 브라우저 내부에서만 연산(100% On-Device)되며, 어떠한 비디오 프레임이나 개인정보도 외부 서버로 전송하지 않습니다.
- **명시적 권한 제어**: 카메라는 사용자가 상단 또는 툴바의 **🖐 손인식** 버튼을 직접 눌렀을 때만 켜지며, 닫기 버튼이나 토글 클릭 시 즉시 카메라 스트림 트랙(`stream.getTracks().forEach(t => t.stop())`)을 완전히 중단하고 비디오 하드웨어 점유를 해제합니다.
- **보안 환경 요구사항**: 브라우저 보안 규정에 따라 웹캠 인터페이스는 안전한 오리진(`http://localhost:*` 또는 `https://`)에서만 동작합니다. 카메라가 없거나 권한을 허용하지 않더라도 화면 내 마우스 클릭 및 터치 드래그로 동일하게 10만 파티클 소용돌이 조작이 가능합니다.
- `.gitignore`는 환경 파일, 인증서·키, 로컬 자격증명 경로, PM2 런타임·로그, IDE 및 OS 파일을 제외합니다. 단, `.gitignore`는 이미 추적 중인 파일이나 코드에 직접 쓴 비밀정보를 제거하지 않으므로 커밋 전 확인이 필요합니다. Git 커밋 작성자도 공개 noreply 주소를 사용합니다.

## 검증

```sh
npm run typecheck
npm test
npm run build
```
