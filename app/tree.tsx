'use client';
import { useEffect, useRef } from 'react';
import { christmasConfig } from '@/lib/config';
export const palettes = [ { name: '클래식', color: '#91e6ba', glow: '#164e38' }, { name: '샴페인', color: '#ecd49d', glow: '#604627' }, { name: '오로라', color: '#b4a0ff', glow: '#3d2867' } ];
export default function Tree({ theme, snow, motion, burst, recipient }: { theme: number; snow: boolean; motion: boolean; burst: number; recipient: string }) {
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
      for (let row = 0; row < 58; row++) { const v = row / 57; if (v < 1 - build) continue; const radius = (12 + v * 176) * (1 - .11 * Math.sin(v * Math.PI * 8)); const count = Math.floor(12 + v * 100); for (let j = 0; j < count; j++) { const a = j / count * Math.PI * 2 + t * .22 + row * .19; const z = Math.cos(a); const garland = Math.sin(a - v * 28) > .965; const ornament = ((row % 11 < 3) && Math.cos(a * 4 + Math.floor(row / 11) * 2.3) > .91) || (row * 31 + j * 17) % 173 === 0; const light = garland || ornament; points.push({ x: cx + Math.sin(a) * radius * scale, y: top + (65 + v * 440 + z * 17) * scale, z, char: ornament ? '@' : garland ? '*' : '@#%&ox*+^vMW=:'[(row * 7 + j * 3) % 14], color: ornament ? ['#ff6b99','#ffe7a5','#ba8bff','#7bbaff'][Math.floor(row / 3) % 4] : garland ? '#f8dca2' : p.color, light }); } }
      points.sort((a,b) => a.z - b.z);
      ctx.textAlign = 'center'; ctx.font = `${9 * scale}px monospace`;
      for (const point of points) { ctx.globalAlpha = point.light ? .6 + .4 * Math.sin(t * 1.8 + point.y) ** 2 : .18 + (point.z + 1) * .31; ctx.fillStyle = point.color; ctx.shadowColor = point.color; ctx.shadowBlur = point.light ? 9 * scale : 0; ctx.fillText(point.char, point.x, point.y);
        if (point.y > top + 415 * scale) { ctx.globalAlpha *= .12; ctx.shadowBlur = 0; ctx.fillText(point.char, point.x + Math.sin(t + point.y) * 4 * scale, top + 1035 * scale - (point.y - top)); } }
      ctx.globalAlpha = Math.max(0, (build - .82) / .18); ctx.shadowColor = '#ffe1a1'; ctx.shadowBlur = 22 * scale; ctx.fillStyle = '#ffe4b0'; ctx.font = `${9 * scale}px monospace`;
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
  }, [theme, snow, motion, burst, recipient]);
  return <canvas ref={ref} className="tree-canvas" role="img" aria-label="금빛 별과 반짝이는 장식으로 꾸민 회전하는 입체 ASCII 크리스마스 트리" />;
}
