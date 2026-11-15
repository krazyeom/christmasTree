'use client';
import { useEffect, useRef } from 'react';
import { christmasConfig } from '@/lib/config';
import { treeStyles, type TreeStyle } from '@/lib/tree-styles';
export const palettes = [ { name: '클래식', color: '#91e6ba', glow: '#164e38' }, { name: '샴페인', color: '#ecd49d', glow: '#604627' }, { name: '오로라', color: '#b4a0ff', glow: '#3d2867' } ];
export default function Tree({ theme, snow, motion, burst, recipient, variant }: { variant: TreeStyle; theme: number; snow: boolean; motion: boolean; burst: number; recipient: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const phase = useRef(0);
  useEffect(() => {
    const canvas = ref.current!; const ctx = canvas.getContext('2d')!;
    let frame = 0, w = 0, h = 0, previous = 0;
    const resize = () => { const rect = canvas.getBoundingClientRect(); w = rect.width; h = rect.height; const dpr = Math.min(devicePixelRatio, 2); canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    const draw = (now: number) => {
      if (previous && now - previous < 32) { frame = requestAnimationFrame(draw); return; }
      const dt = Math.min((now - previous) / 1000, .05); previous = now; if (motion) phase.current += dt;
      const t = phase.current; ctx.clearRect(0, 0, w, h);
      const scale = Math.min(w / 530, h / 720); const cx = w / 2; const top = h / 2 - 300 * scale;
      const build = motion ? Math.min(1, t / christmasConfig.treeBuildSeconds) : 1;
      const p = palettes[theme];
      const halo = ctx.createRadialGradient(cx, h * .56, 0, cx, h * .56, 300 * scale); halo.addColorStop(0, p.glow + '65'); halo.addColorStop(1, p.glow + '00'); ctx.fillStyle = halo; ctx.fillRect(0, 0, w, h);
      if (snow) { ctx.font = `${11 * scale}px monospace`; for (let i = 0; i < christmasConfig.snowCount; i++) { const x = ((i * 137.51 + Math.sin(t * .3 + i) * 25) % w + w) % w; const y = (i * 71.71 + t * christmasConfig.snowSpeed * (10 + i % 16)) % h; ctx.globalAlpha = .15 + (i % 5) * .1; ctx.fillStyle = '#d1eee2'; ctx.fillText(i % 7 === 0 ? '+' : '.', x, y); } }
      ctx.globalAlpha = 1;
      const festiveColors = ['#ff658c', '#ffd66b', '#a98aff', '#65c9ff', '#ff995b', '#6ff0bf'];
      const rotation = t * christmasConfig.rotationSpeed;
      const drawGifts = (front: boolean) => {
        if (!burst) return;
        const gifts = Array.from({ length: 6 }, (_, i) => {
          const angle = i / 6 * Math.PI * 2 + rotation;
          return { i, angle, z: Math.cos(angle) };
        }).filter(gift => (gift.z >= 0) === front).sort((a, b) => a.z - b.z);
        for (const gift of gifts) {
          const size = .8 + (gift.z + 1) * .12;
          ctx.save();
          ctx.translate(cx + Math.sin(gift.angle) * 195 * scale, top + (520 + gift.z * 31) * scale);
          ctx.scale(size * (.72 + Math.abs(Math.cos(gift.angle + .5)) * .28), size);
          ctx.globalAlpha = build * (.65 + (gift.z + 1) * .175);
          ctx.fillStyle = festiveColors[gift.i]; ctx.shadowColor = festiveColors[gift.i]; ctx.shadowBlur = 12 * scale;
          ctx.font = `${10 * scale}px monospace`; ctx.textAlign = 'center';
          ['  >*<  ', '+==+==+', '|##|##|', '|##|##|', '+==+==+'].forEach((line, j) => ctx.fillText(line, 0, j * 9 * scale));
          ctx.restore();
        }
      };
      drawGifts(false);
      const points: {x:number;y:number;z:number;char:string;color:string;light:boolean}[] = [];
      const rows = variant === 'pixel' ? 42 : 64;
      for (let row = 0; row < rows; row++) {
        const v = row / (rows - 1);
        if (v < 1 - build) continue;
        const radius = variant === 'classic'
          ? (12 + v * 176) * (1 - .11 * Math.sin(v * Math.PI * 8))
          : variant === 'pixel' ? 16 + Math.floor(v * 7) * 24 : 9 + v * 179;
        const count = Math.floor(12 + v * (variant === 'pixel' ? 62 : 100));
        const specialList = ['d', 'y', 's', 'w', 'D', 'Y', 'S', 'W'];
        for (let j = 0; j < count; j++) {
          const localAngle = j / count * Math.PI * 2;
          const a = localAngle + rotation + (variant === 'classic' ? row * .19 : 0);
          const z = Math.cos(a);
          let char = '@#%&ox*+^vMW=:'[(row * 7 + j * 3) % 14];
          let color = p.color;
          let light = false;
          let x = Math.sin(a) * radius;
          let depth = z * 17;
          const ribbon = Math.sin(localAngle - v * 31);
          const ornament = ((row % 11 < 3) && Math.cos((localAngle + row * .19) * 4 + Math.floor(row / 11) * 2.3) > .91);

          // d, y (레드)와 s, w (골드) 시그니처 문자를 트리에 매혹적으로 분산 배치
          const isSigSlot = (row * 13 + j * 7) % 17 === 0 || (j % 9 === 2 && row % 4 === 0);
          if (isSigSlot) {
            char = specialList[(row * 3 + j) % specialList.length];
            light = true;
          }

          if (variant === 'classic') {
            const garland = Math.sin(localAngle + row * .19 - v * 28) > .965;
            light = light || ornament || garland;
            if (!isSigSlot) {
              char = ornament ? '@' : garland ? '*' : char;
              color = ornament ? ['#ff6b99','#ffe7a5','#ba8bff','#7bbaff'][Math.floor(row / 3) % 4] : garland ? '#f8dca2' : p.color;
            }
          } else if (variant === 'ribbon') {
            if (Math.abs(ribbon) < .89 && j % 17 !== 0) continue;
            light = light || Math.abs(ribbon) > .93;
            if (!isSigSlot) {
              char = light ? (ribbon > 0 ? '=' : '+') : '.';
              color = ribbon > 0 ? p.color : '#ffd58c';
            }
          } else if (variant === 'pixel') {
            // Rotate a square cross-section, preserving the voxel-like silhouette.
            const squareRadius = radius / Math.max(Math.abs(Math.sin(localAngle)), Math.abs(Math.cos(localAngle)));
            x = Math.sin(a) * squareRadius * .78;
            depth = Math.cos(a) * squareRadius * .12;
            light = light || (row + j * 7) % 31 < 2;
            if (!isSigSlot) {
              char = row % 6 === 0 ? '=' : '#';
              if (light) { char = 'o'; color = ['#ff718c', '#ffdd7f', '#99c7ff'][row % 3]; }
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
              color = light ? '#e5ffe2' : theme === 0 ? ['#31fa83','#56c58a','#208a60'][stream % 3] : p.color;
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
          points.push({ x: cx + x * scale, y: top + (65 + v * 440 + depth) * scale, z, char, color, light });
        }
      }
      // Ornament positions live in tree coordinates so their colors rotate with the branches.
      for (let ring = 0; ring < 9; ring++) {
        const v = .14 + ring * .095;
        if (v < 1 - build) continue;
        const row = Math.round(v * (rows - 1));
        const radius = variant === 'classic' ? (12 + v * 176) * (1 - .11 * Math.sin(v * Math.PI * 8))
          : variant === 'pixel' ? (16 + Math.floor(v * 7) * 24) * .92 : 9 + v * 179;
        for (let j = 0; j < 7; j++) {
          const angle = j / 7 * Math.PI * 2 + ring * 1.37 + rotation;
          const z = Math.cos(angle);
          const x = cx + Math.sin(angle) * (radius + 3) * scale;
          const y = top + (65 + v * 440 + z * 18) * scale;
          const color = festiveColors[(ring * 3 + j) % festiveColors.length];
          const shape = ['(@)', '<*>', '[+d]', '{y}', '(Y)', '{S}', '<W>'][(ring + j) % 7];
          for (let k = 0; k < shape.length; k++) points.push({ x: x + (k - 1) * 5 * scale, y, z: z + .03, char: shape[k], color, light: true });
          points.push({ x, y: y - 7 * scale, z: z + .03, char: '|', color: '#ffe6a3', light: true });
        }
      }
      points.sort((a,b) => a.z - b.z);
      ctx.textAlign = 'center';
      const redSigChars = new Set(['d', 'y', 'D', 'Y']);
      const goldSigChars = new Set(['s', 'w', 'S', 'W']);
      for (const point of points) {
        const isRedSig = redSigChars.has(point.char);
        const isGoldSig = goldSigChars.has(point.char);
        if (isRedSig) {
          const shimmer = Math.sin(t * 5.2 + point.x * 0.05 + point.y * 0.07) ** 2;
          ctx.globalAlpha = Math.min(1, 0.8 + shimmer * 0.2);
          ctx.fillStyle = shimmer > 0.65 ? '#ffe0e8' : '#ff2e56';
          ctx.shadowColor = '#ff2a55';
          ctx.shadowBlur = (15 + shimmer * 14) * scale;
          ctx.font = `bold ${10.5 * scale}px monospace`;
          ctx.fillText(point.char, point.x, point.y);
          ctx.font = `${9 * scale}px monospace`;
        } else if (isGoldSig) {
          const shimmer = Math.sin(t * 4.2 + point.x * 0.06 + point.y * 0.05) ** 2;
          ctx.globalAlpha = Math.min(1, 0.8 + shimmer * 0.2);
          ctx.fillStyle = shimmer > 0.65 ? '#ffffff' : '#ffd166';
          ctx.shadowColor = '#ffe082';
          ctx.shadowBlur = (15 + shimmer * 14) * scale;
          ctx.font = `bold ${10.5 * scale}px monospace`;
          ctx.fillText(point.char, point.x, point.y);
          ctx.font = `${9 * scale}px monospace`;
        } else {
          ctx.globalAlpha = point.light ? .6 + .4 * Math.sin(t * 1.8 + point.y) ** 2 : .18 + (point.z + 1) * .31;
          ctx.fillStyle = point.color;
          ctx.shadowColor = point.color;
          ctx.shadowBlur = point.light ? 9 * scale : 0;
          ctx.fillText(point.char, point.x, point.y);
        }
        if (point.y > top + 415 * scale) {
          ctx.globalAlpha *= .12;
          ctx.shadowBlur = 0;
          ctx.fillText(point.char, point.x + Math.sin(t + point.y) * 4 * scale, top + 1035 * scale - (point.y - top));
        }
      }
      ctx.globalAlpha = Math.min(1, Math.max(0, (build - .82) / .18)); ctx.shadowColor = '#ffe1a1'; ctx.shadowBlur = 22 * scale; ctx.fillStyle = '#ffe4b0'; ctx.font = `${9 * scale}px monospace`;
      const star = ['       *       ', '      ***      ', '     *****     ', '***************', ' ************* ', '   *********   ', '   **** ****   ', '  ***     ***  '];
      star.forEach((line, i) => ctx.fillText(line, cx, top + (i * 8 - 4) * scale));
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0; ctx.fillStyle = '#aa8a5e'; ctx.font = `${12 * scale}px monospace`; for (let i = 0; i < 4; i++) ctx.fillText('|||', cx, top + (520 + i * 10) * scale);
      ctx.fillStyle = '#507262'; ctx.fillText('·  .  _ _ _ _ _ _ _ _ _  .  ·', cx, top + 568 * scale);
      if (burst) {
        const colors = ['#ff92ae', '#e7c272', '#ba9bf4', '#91d8d4'];
        for (let i = 0; i < 7; i++) {
          const progress = (t * christmasConfig.giftSpeed * (24 + i % 3 * 5) + i * 97) % (h + 100);
          const x = w * (.07 + .86 * ((i * .618) % 1)) + Math.sin(t * .6 + i) * 12 * scale;
          const y = motion ? progress - 70 : h * (.2 + i * .09);
          ctx.globalAlpha = .65; ctx.fillStyle = colors[i % 4]; ctx.shadowColor = colors[i % 4]; ctx.shadowBlur = 9 * scale; ctx.font = `${9 * scale}px monospace`;
          ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 1.5 + i) * .25); ctx.scale(.7 + Math.abs(Math.cos(rotation + i)) * .3, 1);
          ['  _><_  ', '+--+--+', '|::|::|', '+--+--+'].forEach((line,j) => ctx.fillText(line,0,j*8*scale)); ctx.restore();
        }

      }
      drawGifts(true);
      if (t > christmasConfig.greetingAppearsAfterSeconds || !motion) {
        ctx.globalAlpha = motion ? Math.min(1,(t-christmasConfig.greetingAppearsAfterSeconds)/2) : 1;
        ctx.font = `600 ${Math.min(19 * scale, w / Math.max(22, (christmasConfig.greeting.length + recipient.length + 1) * .64))}px monospace`;
        ctx.fillStyle = '#ffe0a5'; ctx.shadowColor = '#f3b766'; ctx.shadowBlur = 18 * scale;
        ctx.fillText(`${christmasConfig.greeting} ${recipient}`,cx,top+617*scale);
        ctx.font = `${9 * scale}px monospace`; ctx.fillStyle = '#99b4ab'; ctx.shadowBlur = 0;
        ctx.fillText('* . +  MAY ALL YOUR WISHES GLOW  + . *',cx,top+641*scale);
      }
      // Project an approaching and receding flight path onto the sky.
      const flight = (t % 11) / 3.4;
      if (motion && flight < 1) {
        const baseSize = Math.max(.65, Math.min(1, scale * 1.15));
        const project = (progress: number) => {
          const closeness = Math.sin(Math.PI * progress);
          return {
            x: -210 * baseSize + progress * (w + 360 * baseSize),
            y: h * (.12 + .18 * progress - .075 * closeness),
            size: baseSize * (.55 + .75 * closeness),
          };
        };
        const current = project(flight);
        ctx.save(); ctx.textAlign = 'center';
        // Sample previous positions along the same path to preserve its curved perspective.
        for (let i = 1; i <= 24; i++) {
          const previousFlight = flight - i * .009;
          if (previousFlight < 0) continue;
          const trail = project(previousFlight);
          ctx.font = `bold ${Math.max(3, 8 * trail.size)}px monospace`;
          ctx.globalAlpha = (1 - i / 25) * .8;
          ctx.fillStyle = i % 3 === 0 ? '#ffb4c4' : '#ffe2a3';
          ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8 * trail.size;
          ctx.fillText(i % 4 === 0 ? '*' : '.', trail.x - 12 * trail.size, trail.y + Math.sin(i * 1.9 + t * 10) * 6 * trail.size);
        }
        ctx.globalAlpha = 1;
        ctx.translate(current.x, current.y + Math.sin(t * 15) * 2 * current.size);
        // Banking and foreshortening make the sleigh turn as it passes the viewer.
        ctx.rotate(-.12 + .24 * flight + Math.sin(t * 5) * .035);
        ctx.transform(.8 + .2 * Math.sin(Math.PI * flight), 0, -.12 * Math.cos(Math.PI * flight), 1, 0, 0);
        ctx.textAlign = 'left'; ctx.font = `bold ${10 * current.size}px monospace`;
        ctx.fillStyle = '#ffcc8b'; ctx.shadowColor = '#f6c97e'; ctx.shadowBlur = 10 * current.size;
        const sleigh = [String.raw`  _/\_  [*][+]       \ /`, String.raw` (o_o)  |__|__|       Y`, String.raw` /|_|\__|_____|___  _/\_`, String.raw`  / \  \_________/--(o o)>`, String.raw`        \_______/    / \ `];
        sleigh.forEach((line, i) => ctx.fillText(line, 0, i * 10 * current.size));
        ctx.fillStyle = '#ff526b'; ctx.shadowColor = '#ff526b'; ctx.shadowBlur = 12 * current.size;
        ctx.fillText('*', 155 * current.size, 30 * current.size);
        ctx.fillText('^', 19 * current.size, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1; frame = requestAnimationFrame(draw);
    }; frame = requestAnimationFrame(draw); return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [theme, snow, motion, burst, recipient, variant]);
  return <canvas ref={ref} className="tree-canvas" role="img" aria-label={`${treeStyles.find(style => style.id === variant)?.description}. 회전하는 입체 ASCII 크리스마스 트리와 하늘을 날아가는 산타 썰매`} />;
}
