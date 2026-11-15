# 크리스마스 컬러 팔레트 및 실시간 접속자 집계 시스템 명세

본 문서는 ASCII 크리스마스 트리의 시그니처 문자 색상 분기 렌더링 시스템과 실시간 세션 기반 방문자 집계 메커니즘을 설명합니다.

---

## 1. 개요 및 요구사항
기존의 단일 주황색(Amber `#E09F3E`) 강조 표현을 크리스마스 고유의 3대 정통 컬러로 재편했습니다:
1. **루비 레드 (`d`, `y`, `D`, `Y`)**: 크리스마스 베리와 산타의 벨벳 레드를 상징하는 `#ff2e56` 및 글로우 `#ff2a55`.
2. **샴페인 골드 (`s`, `w`, `S`, `W`)**: 성탄 별과 오너먼트를 상징하는 `#ffd166` 및 글로우 `#ffe082`.
3. **포레스트 그린 / 벨벳 나이트**: 배경과 인터페이스의 깊은 성탄 숲을 구성하는 `#05140f`, `#163c2c`, `#35121b`.

동시에 방문자 카운터를 데모 시드값 방식에서 벗어나 실제 세션 핑 기반의 순수 접속자 카운팅 체계로 확립했습니다.

---

## 2. 시그니처 듀얼 컬러 쉬머 렌더링 (`app/tree.tsx`)

### A. 문자 분기 구조
트리의 3D 점 구름 연산 시 `d`, `y`, `s`, `w` 문자를 분산 배치하고, 렌더 루프에서 집합(`Set`) 연산으로 분기합니다:

```typescript
const redSigChars = new Set(['d', 'y', 'D', 'Y']);
const goldSigChars = new Set(['s', 'w', 'S', 'W']);

for (const point of points) {
  const isRedSig = redSigChars.has(point.char);
  const isGoldSig = goldSigChars.has(point.char);

  if (isRedSig) {
    // 루비 레드 쉬머: 5.2rad/s 펄스
    const shimmer = Math.sin(t * 5.2 + point.x * 0.05 + point.y * 0.07) ** 2;
    ctx.globalAlpha = Math.min(1, 0.8 + shimmer * 0.2);
    ctx.fillStyle = shimmer > 0.65 ? '#ffe0e8' : '#ff2e56';
    ctx.shadowColor = '#ff2a55';
    ctx.shadowBlur = (15 + shimmer * 14) * scale;
    ctx.font = `bold ${10.5 * scale}px monospace`;
    ctx.fillText(point.char, point.x, point.y);
  } else if (isGoldSig) {
    // 샴페인 골드 쉬머: 4.2rad/s 펄스
    const shimmer = Math.sin(t * 4.2 + point.x * 0.06 + point.y * 0.05) ** 2;
    ctx.globalAlpha = Math.min(1, 0.8 + shimmer * 0.2);
    ctx.fillStyle = shimmer > 0.65 ? '#ffffff' : '#ffd166';
    ctx.shadowColor = '#ffe082';
    ctx.shadowBlur = (15 + shimmer * 14) * scale;
    ctx.font = `bold ${10.5 * scale}px monospace`;
    ctx.fillText(point.char, point.x, point.y);
  } else {
    // 일반 트리 문자 렌더링
    // ...
  }
}
```

### B. 타이포그래피 스타일링 연계 (`app/globals.css`, `app/page.tsx`)
텍스트 영역의 시그니처 글자도 동일한 클래스로 일관성을 부여했습니다:
- `.sig-red`: `color: #ff2e56; text-shadow: 0 0 10px rgba(255, 46, 86, 0.6);`
- `.sig-gold`: `color: #ffd166; text-shadow: 0 0 10px rgba(255, 209, 102, 0.6);`
- 로고: `little christma<span className="sig-gold">s</span>`
- 서브타이틀: `A <span className="sig-gold">W</span>ON<span className="sig-red">D</span>ERLAN<span className="sig-red">D</span> IN CHARACTERS`
- 헤드라인: `Ever<span className="sig-red">y</span> character, a little <span className="sig-gold">w</span>ish.`
- 푸터 크레딧: `kraz<span className="sig-red">y</span>eom`

---

## 3. 방문자 카운터 집계 메커니즘 (`app/api/visitors/route.ts`)

### A. 라이브 접속자 수 (Active Visitors)
1. **핑(Heartbeat) 주기**: 브라우저는 마운트 시 최초 세션 등록을 진행하고, 이후 20초 간격으로 백그라운드 핑을 송신합니다.
2. **세션 활성 판정**: 서버는 수신된 세션 ID의 타임스탬프를 `.runtime/visitors.json`에 기록하며, 현재 시각 기준 120초(2분) 이내에 갱신된 세션만 활성 사용자로 집계합니다.
3. **만료 자동 정리**: 120초 이상 핑이 끊긴 세션(창을 닫거나 네트워크 단절)은 즉시 메모리 및 저장소에서 만료 처리하여 `active` 수치가 실시간으로 감소합니다.

### B. 누적 방문자 수 (Total Visitors)
1. **세션 기반 카운트**: 브라우저의 `sessionStorage`에 고유 난수 키(`xmas_session_id`)를 발급하여 최초 접속 시에만 1회 누적 카운트를 증가시킵니다.
2. **새로고침 왜곡 방지**: 단순히 F5를 눌러 페이지를 새로고침할 때는 `POST` 요청에 기존 `sessionId`가 전달되므로 누적 숫자가 중복 증가하지 않습니다.
3. **실제 카운트 기준 운용**: 초기 데모용 시드 번호를 제거하고, 실제 방문자 수치를 순수하게 누적 집계하도록 영속화 저장소를 재설정했습니다.
