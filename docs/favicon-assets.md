# 파비콘 및 앱 아이콘 명세서

## 1. 개요
브라우저 탭, 즐겨찾기 북마크, 모바일 바로가기 화면에서 'little christmas' 서비스를 시각적으로 식별할 수 있도록 맞춤형 벡터 및 래스터 파비콘 에셋을 제작하여 배포했습니다.

Next.js App Router의 메타데이터 및 아이콘 자동 감지 파이프라인을 준수하여, 고해상도 벡터 SVG(`icon.svg`), 멀티 리소스 표준 ICO(`favicon.ico`), 애플 터치 아이콘(`apple-icon.png`)을 모두 갖추었습니다.

---

## 2. 디자인 명세

* **배경**: 딥 포레스트 나이트 (`#061210`) 및 은은한 테두리 (`#1f3b30`)
* **크리스마스 트리**: 3단 구조 기하학 폴리곤 레이어 (에메랄드 그린 그라데이션 `#4ade80` → `#10b981` → `#047857`)
* **꼭대기 별**: 브랜드 시그니처 색상이 반영된 앰버 골드 (`#E09F3E` / `#fff3c4`) 빛나는 8각 크리스마스 별
* **오너먼트 및 파티클**: 루비 레드, 샴페인 옐로우, 스카이 블루 볼과 반짝이는 눈송이 포인트

---

## 3. 에셋 파일 구성

| 파일 경로 | 포맷 및 규격 | 용도 |
| :--- | :--- | :--- |
| `app/icon.svg` / `public/icon.svg` | SVG (Vector, 64x64 viewBox) | 모던 브라우저 고해상도 탭 파비콘 (`image/svg+xml`) |
| `app/favicon.ico` / `public/favicon.ico` | ICO (16x16, 32x32, 64x64 멀티 사이즈) | 레거시 브라우저 및 검색엔진 크롤러 표준 파비콘 (`image/x-icon`) |
| `public/apple-icon.png` | PNG (64x64, RGBA) | iOS Safari 홈 화면 바로가기 아이콘 |

---

## 4. 메타데이터 설정 ([app/layout.tsx](file:///home/krazyeom/dev/christmasTree/app/layout.tsx))

```typescript
export const metadata: Metadata = {
  title: 'A little Christmas · ASCII Wonderland',
  description: '문자로 빛나는 작은 크리스마스. 입체 ASCII 트리와 눈, 오르골 캐럴을 만나보세요.',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/apple-icon.png',
  },
};
```
