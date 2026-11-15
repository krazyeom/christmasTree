'use client';
import { useEffect, useRef } from 'react';
import { christmasConfig } from '@/lib/config';
import { treeStyles, type TreeStyle } from '@/lib/tree-styles';

export const palettes = [
  { name: '클래식', color: '#91e6ba', glow: '#164e38' },
  { name: '샴페인', color: '#ecd49d', glow: '#604627' },
  { name: '오로라', color: '#b4a0ff', glow: '#3d2867' }
];

const APPLE_SVG = 'M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83 M15.97 6.37c.63-.78 1.06-1.85.94-2.94-.91.04-2.03.61-2.68 1.39-.58.67-1.09 1.76-.95 2.83 1.02.08 2.06-.5 2.69-1.28z';

interface ApplePoint {
  x: number;
  y: number;
  z: number;
  isLeaf: boolean;
}

let cachedApplePoints: ApplePoint[] | null = null;

function getApplePoints(): ApplePoint[] {
  if (cachedApplePoints && cachedApplePoints.length > 50) return cachedApplePoints;
  const pts: ApplePoint[] = [];
  if (typeof document !== 'undefined') {
    try {
      const size = 180;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx && typeof Path2D !== 'undefined') {
        ctx.fillStyle = '#ffffff';
        ctx.translate(size / 2, size / 2);
        const s = (size * 0.74) / 24;
        ctx.scale(s, s);
        ctx.translate(-12, -13);
        const p = new Path2D(APPLE_SVG);
        ctx.fill(p);

        const img = ctx.getImageData(0, 0, size, size).data;
        const leafThreshold = size * 0.32;
        for (let y = 0; y < size; y += 2) {
          for (let x = 0; x < size; x += 2) {
            const a = img[(y * size + x) * 4 + 3];
            if (a > 110) {
              const nx = (x - size / 2) / (size * 0.38);
              const ny = (y - size / 2) / (size * 0.38);
              const isLeaf = y < leafThreshold;
              const r2 = nx * nx + ny * ny;
              const nz = Math.sqrt(Math.max(0, 1 - Math.min(1, r2 * 0.7))) * ((pts.length % 2 === 0 ? 1 : -1) * 0.4);
              pts.push({ x: nx, y: ny, z: nz, isLeaf });
            }
          }
        }
      }
    } catch {
      // fallback handled below
    }
  }

  if (pts.length < 50) {
    for (let i = 0; i < 700; i++) {
      const u = (i / 700) * Math.PI * 2;
      const r = 0.8 + 0.18 * Math.cos(u) - 0.1 * Math.sin(2 * u);
      const nx = Math.sin(u) * r * 0.9;
      const ny = -Math.cos(u) * r * 0.9 + 0.1;
      pts.push({ x: nx, y: ny, z: Math.sin(u * 3) * 0.25, isLeaf: false });
    }
    for (let i = 0; i < 90; i++) {
      const angle = (i / 90) * Math.PI * 2;
      pts.push({ x: 0.25 + Math.cos(angle) * 0.18, y: -0.85 + Math.sin(angle) * 0.12, z: 0, isLeaf: true });
    }
  }

  cachedApplePoints = pts;
  return pts;
}

export default function Tree({
  theme,
  snow,
  motion,
  burst,
  recipient,
  variant,
  appleTrigger = 0
}: {
  variant: TreeStyle;
  theme: number;
  snow: boolean;
  motion: boolean;
  burst: number;
  recipient: string;
  appleTrigger?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const phase = useRef(0);

  useEffect(() => {
    phase.current = 0;
  }, [appleTrigger]);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const applePoints = getApplePoints();
    const appleCount = applePoints.length;

    let frame = 0, w = 0, h = 0, previous = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      const dpr = Math.min(devicePixelRatio, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const draw = (now: number) => {
      if (previous && now - previous < 32) {
        frame = requestAnimationFrame(draw);
        return;
      }
      const dt = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      if (motion) phase.current += dt;
      const t = phase.current;
      ctx.clearRect(0, 0, w, h);

      const scale = Math.min(w / 530, h / 720);
      const cx = w / 2;
      const top = h / 2 - 300 * scale;
      const p = palettes[theme];

      // 배경 헤일로 광채
      const halo = ctx.createRadialGradient(cx, h * 0.56, 0, cx, h * 0.56, 300 * scale);
      halo.addColorStop(0, p.glow + '65');
      halo.addColorStop(1, p.glow + '00');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      // 모핑 타임라인 파라미터
      const appleHold = 1.35; // 0 ~ 1.35초: 애플 로고 형태 유지 & 펄싱
      const scatterDuration = 2.4; // 1.35 ~ 3.75초: 은하수 소용돌이 흩어짐 및 트리 안착
      const appleCenterY = top + 265 * scale;
      const appleRadius = 145 * scale;

      // 애플 인트로 인포 및 광채 연출 (t < 2.5초)
      if (t < 2.6) {
        const appleIntroAlpha = Math.max(0, Math.min(1, (2.4 - t) / 0.8));
        if (appleIntroAlpha > 0.01) {
          ctx.save();
          const appleGlow = ctx.createRadialGradient(cx, appleCenterY, 0, cx, appleCenterY, 185 * scale);
          appleGlow.addColorStop(0, `rgba(255, 235, 190, ${0.26 * appleIntroAlpha})`);
          appleGlow.addColorStop(0.45, `rgba(255, 77, 109, ${0.12 * appleIntroAlpha})`);
          appleGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = appleGlow;
          ctx.fillRect(cx - 200 * scale, appleCenterY - 200 * scale, 400 * scale, 400 * scale);

          ctx.font = `bold ${10.5 * scale}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillStyle = `rgba(255, 225, 160, ${0.85 * appleIntroAlpha})`;
          ctx.shadowColor = '#ffd166';
          ctx.shadowBlur = 10 * scale;
          ctx.fillText(' APPLE HOLIDAY MORPH', cx, appleCenterY - 158 * scale);
          ctx.font = `${8.5 * scale}px monospace`;
          ctx.fillStyle = `rgba(180, 218, 202, ${0.72 * appleIntroAlpha})`;
          ctx.shadowBlur = 0;
          ctx.fillText('• THE SPARKS DISPERSE INTO A TREE •', cx, appleCenterY - 142 * scale);
          ctx.restore();
        }
      }

      // 눈 내림 효과
      if (snow) {
        ctx.font = `${11 * scale}px monospace`;
        for (let i = 0; i < christmasConfig.snowCount; i++) {
          const x = ((i * 137.51 + Math.sin(t * 0.3 + i) * 25) % w + w) % w;
          const y = (i * 71.71 + t * christmasConfig.snowSpeed * (10 + (i % 16))) % h;
          ctx.globalAlpha = 0.15 + (i % 5) * 0.1;
          ctx.fillStyle = '#d1eee2';
          ctx.fillText(i % 7 === 0 ? '+' : '.', x, y);
        }
      }
      ctx.globalAlpha = 1;

      const festiveColors = ['#ff658c', '#ffd66b', '#a98aff', '#65c9ff', '#ff995b', '#6ff0bf'];
      const rotation = t * christmasConfig.rotationSpeed;

      // 하단 선물 상자 (모핑 이후 자연스럽게 페이드인)
      const giftAlpha = motion ? Math.max(0, Math.min(1, (t - 2.8) / 1.2)) : 1;
      const drawGifts = (front: boolean) => {
        if (!burst || giftAlpha <= 0) return;
        const gifts = Array.from({ length: 6 }, (_, i) => {
          const angle = (i / 6) * Math.PI * 2 + rotation;
          return { i, angle, z: Math.cos(angle) };
        }).filter(gift => (gift.z >= 0) === front).sort((a, b) => a.z - b.z);

        for (const gift of gifts) {
          const size = 0.8 + (gift.z + 1) * 0.12;
          ctx.save();
          ctx.translate(cx + Math.sin(gift.angle) * 195 * scale, top + (520 + gift.z * 31) * scale);
          ctx.scale(size * (0.72 + Math.abs(Math.cos(gift.angle + 0.5)) * 0.28), size);
          ctx.globalAlpha = giftAlpha * (0.65 + (gift.z + 1) * 0.175);
          ctx.fillStyle = festiveColors[gift.i];
          ctx.shadowColor = festiveColors[gift.i];
          ctx.shadowBlur = 12 * scale;
          ctx.font = `${10 * scale}px monospace`;
          ctx.textAlign = 'center';
          ['  >*<  ', '+==+==+', '|##|##|', '|##|##|', '+==+==+'].forEach((line, j) => ctx.fillText(line, 0, j * 9 * scale));
          ctx.restore();
        }
      };

      drawGifts(false);

      // 트리 및 오너먼트 목표 좌표 생성
      const rawPoints: {
        tx: number;
        ty: number;
        tz: number;
        char: string;
        color: string;
        light: boolean;
        isOrnament?: boolean;
      }[] = [];

      const rows = variant === 'pixel' ? 42 : 64;
      const specialList = ['d', 'y', 's', 'w', 'D', 'Y', 'S', 'W'];

      for (let row = 0; row < rows; row++) {
        const v = row / (rows - 1);
        const radius = variant === 'classic'
          ? (12 + v * 176) * (1 - 0.11 * Math.sin(v * Math.PI * 8))
          : variant === 'pixel' ? 16 + Math.floor(v * 7) * 24 : 9 + v * 179;
        const count = Math.floor(12 + v * (variant === 'pixel' ? 62 : 100));

        for (let j = 0; j < count; j++) {
          const localAngle = (j / count) * Math.PI * 2;
          const a = localAngle + rotation + (variant === 'classic' ? row * 0.19 : 0);
          const z = Math.cos(a);
          let char = '@#%&ox*+^vMW=:'[(row * 7 + j * 3) % 14];
          let color = p.color;
          let light = false;
          let x = Math.sin(a) * radius;
          let depth = z * 17;
          const ribbon = Math.sin(localAngle - v * 31);
          const ornament = ((row % 11 < 3) && Math.cos((localAngle + row * 0.19) * 4 + Math.floor(row / 11) * 2.3) > 0.91);

          const isSigSlot = (row * 13 + j * 7) % 17 === 0 || (j % 9 === 2 && row % 4 === 0);
          if (isSigSlot) {
            char = specialList[(row * 3 + j) % specialList.length];
            light = true;
          }

          if (variant === 'classic') {
            const garland = Math.sin(localAngle + row * 0.19 - v * 28) > 0.965;
            light = light || ornament || garland;
            if (!isSigSlot) {
              char = ornament ? '@' : garland ? '*' : char;
              color = ornament ? ['#ff6b99', '#ffe7a5', '#ba8bff', '#7bbaff'][Math.floor(row / 3) % 4] : garland ? '#f8dca2' : p.color;
            }
          } else if (variant === 'ribbon') {
            if (Math.abs(ribbon) < 0.89 && j % 17 !== 0) continue;
            light = light || Math.abs(ribbon) > 0.93;
            if (!isSigSlot) {
              char = light ? (ribbon > 0 ? '=' : '+') : '.';
              color = ribbon > 0 ? p.color : '#ffd58c';
            }
          } else if (variant === 'pixel') {
            const squareRadius = radius / Math.max(Math.abs(Math.sin(localAngle)), Math.abs(Math.cos(localAngle)));
            x = Math.sin(a) * squareRadius * 0.78;
            depth = Math.cos(a) * squareRadius * 0.12;
            light = light || (row + j * 7) % 31 < 2;
            if (!isSigSlot) {
              char = row % 6 === 0 ? '=' : '#';
              if (light) {
                char = 'o';
                color = ['#ff718c', '#ffdd7f', '#99c7ff'][row % 3];
              }
            }
          } else if (variant === 'stars') {
            const meridian = j % Math.max(2, Math.round(count / 7)) === 0;
            if (row % 9 !== 0 && !meridian) continue;
            light = light || (row % 9 === 0 && meridian);
            if (!isSigSlot) {
              char = light ? '*' : row % 9 === 0 ? '.' : ':';
              color = light ? '#fff0bd' : p.color;
            }
          } else if (variant === 'matrix') {
            const stream = (row + Math.floor(t * 12) + j * 7) % 23;
            if (stream > 16) continue;
            light = light || stream < 2;
            if (!isSigSlot) {
              char = ((row * 17 + j + Math.floor(t * 3)) % 2).toString();
              color = light ? '#e5ffe2' : theme === 0 ? ['#31fa83', '#56c58a', '#208a60'][stream % 3] : p.color;
            }
          } else {
            const vertical = j % Math.max(2, Math.round(count / 10)) === 0;
            if (row % 7 !== 0 && !vertical) continue;
            light = light || (row + Math.floor(t * 10) + j) % 21 < 3;
            if (!isSigSlot) {
              char = row % 7 === 0 ? (vertical ? '+' : '-') : '|';
              if (vertical && row % 7 === 0) char = 'o';
              color = light ? '#fff2af' : p.color;
            }
          }
          rawPoints.push({
            tx: cx + x * scale,
            ty: top + (65 + v * 440 + depth) * scale,
            tz: z,
            char,
            color,
            light
          });
        }
      }

      // 오너먼트
      for (let ring = 0; ring < 9; ring++) {
        const v = 0.14 + ring * 0.095;
        const radius = variant === 'classic' ? (12 + v * 176) * (1 - 0.11 * Math.sin(v * Math.PI * 8))
          : variant === 'pixel' ? (16 + Math.floor(v * 7) * 24) * 0.92 : 9 + v * 179;
        for (let j = 0; j < 7; j++) {
          const angle = (j / 7) * Math.PI * 2 + ring * 1.37 + rotation;
          const z = Math.cos(angle);
          const x = cx + Math.sin(angle) * (radius + 3) * scale;
          const y = top + (65 + v * 440 + z * 18) * scale;
          const color = festiveColors[(ring * 3 + j) % festiveColors.length];
          const shape = ['(@)', '<*>', '[+d]', '{y}', '(Y)', '{S}', '<W>'][(ring + j) % 7];
          for (let k = 0; k < shape.length; k++) {
            rawPoints.push({
              tx: x + (k - 1) * 5 * scale,
              ty: y,
              tz: z + 0.03,
              char: shape[k],
              color,
              light: true,
              isOrnament: true
            });
          }
          rawPoints.push({
            tx: x,
            ty: y - 7 * scale,
            tz: z + 0.03,
            char: '|',
            color: '#ffe6a3',
            light: true,
            isOrnament: true
          });
        }
      }

      // 애플 모핑(Scatter & Morph)을 각 점에 적용
      const finalPoints: {
        x: number;
        y: number;
        z: number;
        char: string;
        color: string;
        light: boolean;
        isSig: boolean;
        sigType: 'red' | 'gold' | 'none';
      }[] = [];

      const redSigChars = new Set(['d', 'y', 'D', 'Y']);
      const goldSigChars = new Set(['s', 'w', 'S', 'W']);

      const appleChars = ['', '@', '*', '+', 'o', '%', '#', '&', 'd', 'y', 's', 'w', 'Y', 'S', 'W'];

      for (let i = 0; i < rawPoints.length; i++) {
        const pt = rawPoints[i];
        const ap = applePoints[i % appleCount];

        // 점별 유기적 지연 시간 (애플 외곽 및 난수에 따른 시차 부여)
        const distFromCenter = Math.sqrt(ap.x * ap.x + ap.y * ap.y);
        const delay = distFromCenter * 0.32 + (((i * 7) % 23) / 23) * 0.38;
        const tau = motion ? Math.max(0, Math.min(1, (t - appleHold - delay) / (scatterDuration - 0.7))) : 1;

        let curX = pt.tx;
        let curY = pt.ty;
        let curZ = pt.tz;
        let curChar = pt.char;
        let curColor = pt.color;
        let curLight = pt.light;

        let isRed = redSigChars.has(pt.char);
        let isGold = goldSigChars.has(pt.char);

        if (tau < 1) {
          // Easing: Smooth cubic in-out
          const ease = tau < 0.5 ? 4 * tau * tau * tau : 1 - Math.pow(-2 * tau + 2, 3) / 2;
          const arc = Math.sin(Math.PI * tau); // 0 -> 1 -> 0 (최대 흩어짐 아치)

          // 은하수 폭죽 흩어짐(Scatter) 오프셋
          const angle = i * 2.399963;
          const scatterDist = (70 + (i % 13) * 18 + ((i * 5) % 17) * 8) * scale;
          const swirl = (1 - tau) * 3.8;
          const sox = Math.cos(angle + swirl) * scatterDist * arc;
          const soy = Math.sin(angle + swirl) * scatterDist * 0.65 * arc - 42 * arc * scale;
          const soz = Math.sin(angle * 2) * 0.7 * arc;

          // 초기 애플 로고 위치 (미세한 호흡 박동)
          const pulse = 1 + 0.02 * Math.sin(t * 4.5 + ap.x * 2.5);
          const ax = cx + ap.x * appleRadius * pulse;
          const ay = appleCenterY + ap.y * appleRadius * pulse;
          const az = ap.z;

          curX = ax * (1 - ease) + pt.tx * ease + sox;
          curY = ay * (1 - ease) + pt.ty * ease + soy;
          curZ = az * (1 - ease) + pt.tz * ease + soz;

          // 애플 단계 및 흩어짐 단계에서의 색상 & 문자 보간
          if (tau < 0.32) {
            if (ap.isLeaf) {
              curChar = i % 4 === 0 ? '' : '*';
              curColor = '#ffd166';
              curLight = true;
              isGold = true;
              isRed = false;
            } else {
              curChar = appleChars[(i * 3 + Math.floor(t * 4)) % appleChars.length];
              const isAppleSig = (i % 7 === 0) || (i % 11 === 1);
              if (isAppleSig) {
                curLight = true;
                if (i % 2 === 0) {
                  curColor = '#ff2e56';
                  curChar = specialList[i % 4]; // d, y, D, Y
                  isRed = true;
                  isGold = false;
                } else {
                  curColor = '#ffd166';
                  curChar = specialList[4 + (i % 4)]; // s, w, S, W
                  isGold = true;
                  isRed = false;
                }
              } else {
                curColor = i % 5 === 0 ? '#ffffff' : '#f4e4c2';
                curLight = i % 6 === 0;
              }
            }
          } else if (tau < 0.75) {
            // 흩어지는 도중 화려한 크리스마스 별빛 쉬머
            curLight = true;
            if (i % 4 === 0) {
              curColor = festiveColors[i % festiveColors.length];
            }
          }
        }

        finalPoints.push({
          x: curX,
          y: curY,
          z: curZ,
          char: curChar,
          color: curColor,
          light: curLight,
          isSig: isRed || isGold,
          sigType: isRed ? 'red' : isGold ? 'gold' : 'none'
        });
      }

      finalPoints.sort((a, b) => a.z - b.z);

      ctx.textAlign = 'center';
      for (const point of finalPoints) {
        if (point.sigType === 'red') {
          const shimmer = Math.sin(t * 5.2 + point.x * 0.05 + point.y * 0.07) ** 2;
          ctx.globalAlpha = Math.min(1, 0.8 + shimmer * 0.2);
          ctx.fillStyle = shimmer > 0.65 ? '#ffe0e8' : '#ff2e56';
          ctx.shadowColor = '#ff2a55';
          ctx.shadowBlur = (15 + shimmer * 14) * scale;
          ctx.font = `bold ${10.5 * scale}px monospace`;
          ctx.fillText(point.char, point.x, point.y);
          ctx.font = `${9 * scale}px monospace`;
        } else if (point.sigType === 'gold') {
          const shimmer = Math.sin(t * 4.2 + point.x * 0.06 + point.y * 0.05) ** 2;
          ctx.globalAlpha = Math.min(1, 0.8 + shimmer * 0.2);
          ctx.fillStyle = shimmer > 0.65 ? '#ffffff' : '#ffd166';
          ctx.shadowColor = '#ffe082';
          ctx.shadowBlur = (15 + shimmer * 14) * scale;
          ctx.font = `bold ${10.5 * scale}px monospace`;
          ctx.fillText(point.char, point.x, point.y);
          ctx.font = `${9 * scale}px monospace`;
        } else {
          ctx.globalAlpha = point.light ? 0.6 + 0.4 * Math.sin(t * 1.8 + point.y) ** 2 : 0.18 + (point.z + 1) * 0.31;
          ctx.fillStyle = point.color;
          ctx.shadowColor = point.color;
          ctx.shadowBlur = point.light ? 9 * scale : 0;
          ctx.fillText(point.char, point.x, point.y);
        }

        // 바닥 반사 (트리 안착 이후)
        if (t > 3.2 && point.y > top + 415 * scale) {
          ctx.globalAlpha *= 0.12 * Math.min(1, (t - 3.2) / 1.0);
          ctx.shadowBlur = 0;
          ctx.fillText(point.char, point.x + Math.sin(t + point.y) * 4 * scale, top + 1035 * scale - (point.y - top));
        }
      }

      // 트리 꼭대기 별 (모핑 완료 시점 t >= 3.6초에 찬란하게 페이드인)
      const starAlpha = motion ? Math.min(1, Math.max(0, (t - 3.5) / 1.2)) : 1;
      if (starAlpha > 0.01) {
        ctx.globalAlpha = starAlpha;
        ctx.shadowColor = '#ffe1a1';
        ctx.shadowBlur = 22 * scale;
        ctx.fillStyle = '#ffe4b0';
        ctx.font = `${9 * scale}px monospace`;
        const star = ['       *       ', '      ***      ', '     *****     ', '***************', ' ************* ', '   *********   ', '   **** ****   ', '  ***     ***  '];
        star.forEach((line, i) => ctx.fillText(line, cx, top + (i * 8 - 4) * scale));
      }
      ctx.globalAlpha = 1;

      // 트리 줄기 밑둥 및 바닥 선
      if (t > 3.0 || !motion) {
        const trunkAlpha = motion ? Math.min(1, (t - 3.0) / 1.0) : 1;
        ctx.globalAlpha = trunkAlpha;
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#aa8a5e';
        ctx.font = `${12 * scale}px monospace`;
        for (let i = 0; i < 4; i++) ctx.fillText('|||', cx, top + (520 + i * 10) * scale);
        ctx.fillStyle = '#507262';
        ctx.fillText('·  .  _ _ _ _ _ _ _ _ _  .  ·', cx, top + 568 * scale);
        ctx.globalAlpha = 1;
      }

      // 떠오르는 선물 상자 파티클 (t > 3.4초)
      if (burst && (t > 3.4 || !motion)) {
        const colors = ['#ff92ae', '#e7c272', '#ba9bf4', '#91d8d4'];
        const burstAlpha = motion ? Math.min(1, (t - 3.4) / 1.0) : 1;
        for (let i = 0; i < 7; i++) {
          const progress = (t * christmasConfig.giftSpeed * (24 + (i % 3) * 5) + i * 97) % (h + 100);
          const x = w * (0.07 + 0.86 * ((i * 0.618) % 1)) + Math.sin(t * 0.6 + i) * 12 * scale;
          const y = motion ? progress - 70 : h * (0.2 + i * 0.09);
          ctx.globalAlpha = 0.65 * burstAlpha;
          ctx.fillStyle = colors[i % 4];
          ctx.shadowColor = colors[i % 4];
          ctx.shadowBlur = 9 * scale;
          ctx.font = `${9 * scale}px monospace`;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.sin(t * 1.5 + i) * 0.25);
          ctx.scale(0.7 + Math.abs(Math.cos(rotation + i)) * 0.3, 1);
          ['  _><_  ', '+--+--+', '|::|::|', '+--+--+'].forEach((line, j) => ctx.fillText(line, 0, j * 8 * scale));
          ctx.restore();
        }
      }

      drawGifts(true);

      // 인사 문구 표시 (t > 3.8초)
      if (t > 3.8 || !motion) {
        ctx.globalAlpha = motion ? Math.min(1, (t - 3.8) / 1.5) : 1;
        ctx.font = `600 ${Math.min(19 * scale, w / Math.max(22, (christmasConfig.greeting.length + recipient.length + 1) * 0.64))}px monospace`;
        ctx.fillStyle = '#ffe0a5';
        ctx.shadowColor = '#f3b766';
        ctx.shadowBlur = 18 * scale;
        ctx.fillText(`${christmasConfig.greeting} ${recipient}`, cx, top + 617 * scale);
        ctx.font = `${9 * scale}px monospace`;
        ctx.fillStyle = '#99b4ab';
        ctx.shadowBlur = 0;
        ctx.fillText('* . +  MAY ALL YOUR WISHES GLOW  + . *', cx, top + 641 * scale);
      }

      // 산타 썰매 비행 경로 (t > 3.2초)
      const flight = (t % 11) / 3.4;
      if (motion && flight < 1 && t > 3.2) {
        const baseSize = Math.max(0.65, Math.min(1, scale * 1.15));
        const project = (progress: number) => {
          const closeness = Math.sin(Math.PI * progress);
          return {
            x: -210 * baseSize + progress * (w + 360 * baseSize),
            y: h * (0.12 + 0.18 * progress - 0.075 * closeness),
            size: baseSize * (0.55 + 0.75 * closeness)
          };
        };
        const current = project(flight);
        ctx.save();
        ctx.textAlign = 'center';
        for (let i = 1; i <= 24; i++) {
          const previousFlight = flight - i * 0.009;
          if (previousFlight < 0) continue;
          const trail = project(previousFlight);
          ctx.font = `bold ${Math.max(3, 8 * trail.size)}px monospace`;
          ctx.globalAlpha = (1 - i / 25) * 0.8;
          ctx.fillStyle = i % 3 === 0 ? '#ffb4c4' : '#ffe2a3';
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 8 * trail.size;
          ctx.fillText(i % 4 === 0 ? '*' : '.', trail.x - 12 * trail.size, trail.y + Math.sin(i * 1.9 + t * 10) * 6 * trail.size);
        }
        ctx.globalAlpha = 1;
        ctx.translate(current.x, current.y + Math.sin(t * 15) * 2 * current.size);
        ctx.rotate(-0.12 + 0.24 * flight + Math.sin(t * 5) * 0.035);
        ctx.transform(0.8 + 0.2 * Math.sin(Math.PI * flight), 0, -0.12 * Math.cos(Math.PI * flight), 1, 0, 0);
        ctx.textAlign = 'left';
        ctx.font = `bold ${10 * current.size}px monospace`;
        ctx.fillStyle = '#ffcc8b';
        ctx.shadowColor = '#f6c97e';
        ctx.shadowBlur = 10 * current.size;
        const sleigh = [
          String.raw`  _/\_  [*][+]       \ /`,
          String.raw` (o_o)  |__|__|       Y`,
          String.raw` /|_|\__|_____|___  _/\_`,
          String.raw`  / \  \_________/--(o o)>`,
          String.raw`        \_______/    / \ `
        ];
        sleigh.forEach((line, i) => ctx.fillText(line, 0, i * 10 * current.size));
        ctx.fillStyle = '#ff526b';
        ctx.shadowColor = '#ff526b';
        ctx.shadowBlur = 12 * current.size;
        ctx.fillText('*', 155 * current.size, 30 * current.size);
        ctx.fillText('^', 19 * current.size, 0);
        ctx.restore();
      }

      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [theme, snow, motion, burst, recipient, variant]);

  return (
    <canvas
      ref={ref}
      className="tree-canvas"
      role="img"
      aria-label={`${treeStyles.find(style => style.id === variant)?.description}. 애플 로고에서 점들이 은하수처럼 흩어지며 피어나는 3D ASCII 크리스마스 트리`}
    />
  );
}

