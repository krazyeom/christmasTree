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
      const points: {x:number;y:number;z:number;char:string;color:string;light:boolean}[] = [];
      const rows = variant === 'pixel' ? 42 : 64;
      for (let row = 0; row < rows; row++) {
        const v = row / (rows - 1);
        if (v < 1 - build) continue;
        const radius = variant === 'classic'
          ? (12 + v * 176) * (1 - .11 * Math.sin(v * Math.PI * 8))
          : variant === 'pixel' ? 16 + Math.floor(v * 7) * 24 : 9 + v * 179;
        const count = Math.floor(12 + v * (variant === 'pixel' ? 62 : 100));
        for (let j = 0; j < count; j++) {
          const localAngle = j / count * Math.PI * 2;
          const a = localAngle + t * .22 + (variant === 'classic' ? row * .19 : 0);
          const z = Math.cos(a);
          let char = '@#%&ox*+^vMW=:'[(row * 7 + j * 3) % 14];
          let color = p.color;
          let light = false;
          let x = Math.sin(a) * radius;
          let depth = z * 17;
          const ribbon = Math.sin(localAngle - v * 31);
          const ornament = ((row % 11 < 3) && Math.cos(a * 4 + Math.floor(row / 11) * 2.3) > .91);
          if (variant === 'classic') {
            const garland = Math.sin(a - v * 28) > .965;
            light = ornament || garland;
            char = ornament ? '@' : garland ? '*' : char;
            color = ornament ? ['#ff6b99','#ffe7a5','#ba8bff','#7bbaff'][Math.floor(row / 3) % 4] : garland ? '#f8dca2' : p.color;
          } else if (variant === 'ribbon') {
            if (Math.abs(ribbon) < .89 && j % 17 !== 0) continue;
            light = Math.abs(ribbon) > .93;
            char = light ? (ribbon > 0 ? '=' : '+') : '.';
            color = ribbon > 0 ? p.color : '#ffd58c';
          } else if (variant === 'pixel') {
            // Rotate a square cross-section, preserving the voxel-like silhouette.
            const squareRadius = radius / Math.max(Math.abs(Math.sin(localAngle)), Math.abs(Math.cos(localAngle)));
            x = Math.sin(a) * squareRadius * .78;
            depth = Math.cos(a) * squareRadius * .12;
            char = row % 6 === 0 ? '=' : '#';
            light = (row + j * 7) % 31 < 2;
            if (light) { char = 'o'; color = ['#ff718c', '#ffdd7f', '#99c7ff'][row % 3]; }
          } else if (variant === 'stars') {
            const meridian = j % Math.max(2, Math.round(count / 7)) === 0;
            if (row % 9 !== 0 && !meridian) continue;
            light = row % 9 === 0 && meridian;
            char = light ? '*' : row % 9 === 0 ? '.' : ':';
            color = light ? '#fff0bd' : p.color;
          } else if (variant === 'matrix') {
            const stream = (row + Math.floor(t * 12) + j * 7) % 23;
            if (stream > 16) continue;
            char = ((row * 17 + j + Math.floor(t * 3)) % 2).toString();
            light = stream < 2;
            color = light ? '#e5ffe2' : theme === 0 ? ['#31fa83','#56c58a','#208a60'][stream % 3] : p.color;
          } else {
            const vertical = j % Math.max(2, Math.round(count / 10)) === 0;
            if (row % 7 !== 0 && !vertical) continue;
            char = row % 7 === 0 ? (vertical ? '+' : '-') : '|';
            light = (row + Math.floor(t * 10) + j) % 21 < 3;
            if (vertical && row % 7 === 0) char = 'o';
            color = light ? '#fff2af' : p.color;
          }
          points.push({ x: cx + x * scale, y: top + (65 + v * 440 + depth) * scale, z, char, color, light });
        }
      }
      points.sort((a,b) => a.z - b.z);
      ctx.textAlign = 'center'; ctx.font = `${9 * scale}px monospace`;
      for (const point of points) { ctx.globalAlpha = point.light ? .6 + .4 * Math.sin(t * 1.8 + point.y) ** 2 : .18 + (point.z + 1) * .31; ctx.fillStyle = point.color; ctx.shadowColor = point.color; ctx.shadowBlur = point.light ? 9 * scale : 0; ctx.fillText(point.char, point.x, point.y);
        if (point.y > top + 415 * scale) { ctx.globalAlpha *= .12; ctx.shadowBlur = 0; ctx.fillText(point.char, point.x + Math.sin(t + point.y) * 4 * scale, top + 1035 * scale - (point.y - top)); } }
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
          ['  _><_  ', '+--+--+', '|::|::|', '+--+--+'].forEach((line,j) => ctx.fillText(line,x,y+j*8*scale));
        }
        for (let i = 0; i < 3; i++) {
          ctx.globalAlpha = build; ctx.fillStyle = colors[i]; ctx.shadowColor = colors[i]; ctx.shadowBlur = 14 * scale; ctx.font = `${10 * scale}px monospace`;
          ['  >*<  ', '+==+==+', '|##|##|', '|##|##|', '+==+==+'].forEach((line,j) => ctx.fillText(line,cx+(i-1)*150*scale,top+(520+j*9)*scale));
        }
      }
      if (t > christmasConfig.greetingAppearsAfterSeconds || !motion) {
        ctx.globalAlpha = motion ? Math.min(1,(t-christmasConfig.greetingAppearsAfterSeconds)/2) : 1;
        ctx.font = `600 ${Math.min(19 * scale, w / Math.max(22, (christmasConfig.greeting.length + recipient.length + 1) * .64))}px monospace`;
        ctx.fillStyle = '#ffe0a5'; ctx.shadowColor = '#f3b766'; ctx.shadowBlur = 18 * scale;
        ctx.fillText(`${christmasConfig.greeting} ${recipient}`,cx,top+617*scale);
        ctx.font = `${9 * scale}px monospace`; ctx.fillStyle = '#99b4ab'; ctx.shadowBlur = 0;
        ctx.fillText('* . +  MAY ALL YOUR WISHES GLOW  + . *',cx,top+641*scale);
      }
      ctx.globalAlpha = 1; frame = requestAnimationFrame(draw);
    }; frame = requestAnimationFrame(draw); return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [theme, snow, motion, burst, recipient, variant]);
  return <canvas ref={ref} className="tree-canvas" role="img" aria-label={`${treeStyles.find(style => style.id === variant)?.description}. 회전하는 입체 ASCII 크리스마스 트리`} />;
}
