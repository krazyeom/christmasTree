'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Tree, { palettes, type TreeTopper } from './tree';
import CodeStream from './code-stream';
import { MusicBox, songs } from '@/lib/music';
import { christmasConfig } from '@/lib/config';
import { treeStyles, type TreeStyle } from '@/lib/tree-styles';
export default function Home() {
  const [variant, setVariant] = useState<TreeStyle>('classic');
  const currentStyle = treeStyles.find(style => style.id === variant)!;
  const [theme, setTheme] = useState(0);
  const [snow, setSnow] = useState(true);
  const [motion, setMotion] = useState(true);
  const [burst, setBurst] = useState(1);
  const [replay, setReplay] = useState(0);
  const [topper, setTopper] = useState<TreeTopper>('red-apple');
  const [playing, setPlaying] = useState(false);
  const [song, setSong] = useState(0);
  const [volume, setVolume] = useState(.45);
  const [recipient, setRecipient] = useState<string>(christmasConfig.recipient);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [autoplayPending, setAutoplayPending] = useState(true);
  const autoplayWanted = useRef(true);
  const volumeRef = useRef(.45);
  const [tick, setTick] = useState(0);
  const box = useRef<MusicBox | null>(null);
  const [visitors, setVisitors] = useState<{ total: number; today: number; active: number }>({
    total: 1,
    today: 1,
    active: 1,
  });

  const cycleTopper = useCallback(() => {
    setTopper(curr => (curr === 'red-apple' ? 'white-apple' : 'red-apple'));
  }, []);

  useEffect(() => {
    let sessionId = typeof window !== 'undefined' ? (sessionStorage.getItem('xmas_session_id') || '') : '';
    const ping = async (isFirst = false) => {
      try {
        const res = await fetch('/api/visitors', {
          method: isFirst ? 'POST' : 'GET',
          headers: { 'Content-Type': 'application/json' },
          body: isFirst ? JSON.stringify({ sessionId }) : undefined,
        });
        if (res.ok) {
          const data = await res.json();
          setVisitors({ total: data.total, today: data.today, active: data.active });
          if (data.sessionId && typeof window !== 'undefined') {
            sessionStorage.setItem('xmas_session_id', data.sessionId);
            sessionId = data.sessionId;
          }
        }
      } catch {
        // ignore
      }
    };
    void ping(true);
    const timer = setInterval(() => void ping(false), 20000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => { if (!motion) return; const timer = setInterval(() => setTick(t => t + 1), 350); return () => clearInterval(timer); }, [motion]);
  const startMusic = useCallback(async (index: number) => {
    let player = box.current;
    if (!player || player.isClosed) {
      box.current?.close();
      player = new MusicBox(volumeRef.current, (nextSongIndex) => {
        setSong(nextSongIndex);
      });
      box.current = player;
    } else {
      player.setOnSongChange((nextSongIndex) => {
        setSong(nextSongIndex);
      });
    }
    try {
      const started = await player.play(index);
      if (box.current !== player) return;
      setPlaying(started);
      setAutoplayPending(!started && autoplayWanted.current);
      setError('');
      if (started) autoplayWanted.current = false;
    } catch {
      if (box.current !== player) return;
      setPlaying(false);
      setAutoplayPending(autoplayWanted.current);
      if (!autoplayWanted.current) setError('음악을 재생하지 못했어요. 재생 버튼을 다시 눌러주세요.');
    }
  }, []);
  useEffect(() => {
    // 1. 페이지 진입 즉시 자동 재생 시도
    void startMusic(0);

    // 2. 브라우저 보안 정책으로 suspended된 경우, 화면 전체 첫 제스처에서 동기식 즉각 언락
    const handleGesture = (e: Event) => {
      if (e.target instanceof Element && e.target.closest('input, textarea, select')) return;
      const player = box.current;
      if (player && !player.isClosed) {
        player.unlockAndPlay(song).then(started => {
          if (started) {
            setPlaying(true);
            setAutoplayPending(false);
            cleanup();
          }
        });
      } else {
        void startMusic(song);
        cleanup();
      }
    };

    const cleanup = () => {
      document.removeEventListener('pointerdown', handleGesture, true);
      document.removeEventListener('click', handleGesture, true);
      document.removeEventListener('touchstart', handleGesture, true);
      document.removeEventListener('keydown', handleGesture, true);
    };

    document.addEventListener('pointerdown', handleGesture, true);
    document.addEventListener('click', handleGesture, true);
    document.addEventListener('touchstart', handleGesture, true);
    document.addEventListener('keydown', handleGesture, true);

    return () => {
      cleanup();
      box.current?.close();
      box.current = null;
    };
  }, [startMusic, song]);
  function toggleMusic() {
    autoplayWanted.current = false; setAutoplayPending(false);
    if (playing) { box.current?.close(); box.current = null; setPlaying(false); }
    else void startMusic(song);
  }
  async function fullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { setError('이 브라우저는 전체 화면을 지원하지 않습니다.'); } }
  return <main className={motion ? '' : 'paused'}>
    <header>
      <a className="brand" href="/" aria-label="ASCII Christmas 홈">
        <span className="brand-star">✳</span>
        <span>
          little christma<span className="sig-gold">s</span>
          <span className="brand-sub">A <span className="sig-gold">W</span>ON<span className="sig-red">D</span>ERLAN<span className="sig-red">D</span> IN CHARACTERS</span>
        </span>
      </a>
      <div className="header-meta">
        <div className="visitor-badge" title="현재 접속자 및 누적 방문자">
          <span className="live-dot" />
          <span>LIVE <b>{visitors.active}</b>명 접속 중</span>
          <span className="badge-sep">/</span>
          <span>누적 <b>{visitors.total.toLocaleString()}</b>명</span>
        </div>
        <div className="edition"><i /> CHRISTMAS EDITION <span> / 2026</span></div>
      </div>
    </header>
    <section className="intro">
      <div className="eyebrow">✧ A LITTLE CODE. A LITTLE MAGIC. ✧</div>
      <h1>Ever<span className="sig-red">y</span> character, <em>a little <span className="sig-gold">w</span>ish.</em></h1>
      <p>작은 문자들이 모여, 당신만의 크리스마스가 됩니다.</p>
    </section>
    <section className="wonderland" aria-label="인터랙티브 크리스마스 트리">
      <div className="stage-top">
        <div className="stage-top-left">
          <span>
            <i /> LIVE ASCII WONDERLAND
            <span className="stage-visitors">· 🎄 <b>{visitors.active}</b>명 감상 중</span>
          </span>
          {!playing && (
            <button className="quick-sound-btn" onClick={() => void startMusic(song)} aria-label="크리스마스 캐럴 켜기">
              ♪ 캐럴 켜기
            </button>
          )}
        </div>
        <div className="stage-top-right">
          {playing && (
            <button className="sound-status-pill" onClick={toggleMusic} aria-label="캐럴 일시정지">
              ♫ {songs[song].title}
            </button>
          )}
          {variant === 'apple' && (
            <>
              <button
                className={`topper-pill-btn topper-${topper}`}
                onClick={cycleTopper}
                title="애플 꼭대기 장식 토글 (빨간 사과 / 하얀 사과)"
                aria-label={`애플 꼭대기 장식: ${topper === 'red-apple' ? '빨간 사과' : '하얀 사과'}`}
              >
                {topper === 'red-apple' ? '🍎 빨간사과' : '🍏 하얀사과'}
              </button>
              <button
                className="apple-morph-btn"
                onClick={() => { setReplay(v => v + 1); setTick(0); if (!motion) setMotion(true); }}
                title="애플 로고에서 점들이 흩어져 트리가 되는 모핑 다시보기"
                aria-label="애플 모핑 다시보기"
              >
                 모핑
              </button>
            </>
          )}
          <button onClick={fullscreen} title="전체 화면" aria-label="전체 화면 전환">⛶</button>
        </div>
      </div>
      <div className="style-picker" role="group" aria-label="트리 버전 선택">{treeStyles.map(style => <button key={style.id} aria-pressed={variant === style.id} title={style.description} onClick={() => { setVariant(style.id); setReplay(v => v + 1); setTick(0); }}><span>{style.icon}</span>{style.name}</button>)}</div>
      <div className="scene" onClick={() => { if (!playing) void startMusic(song); setBurst(b => b ? b : 1); }}>
        <Tree variant={variant} key={replay} theme={theme} snow={snow} motion={motion} burst={burst} recipient={recipient} appleTrigger={replay} topper={topper} />
        {!playing && autoplayPending && (
          <div className="scene-hint" role="button" aria-label="음악 재생 시작">
            ♪ 화면을 클릭하면 크리스마스 캐럴이 시작돼요
          </div>
        )}
        <div className="telemetry" aria-hidden="true"><span>{currentStyle.label}</span><span>renderer WebGL-free / ASCII</span><span>rotation {((tick * .35 * christmasConfig.rotationSpeed * 180 / Math.PI) % 360).toFixed(1)}°</span><span>magic {motion ? 'in progress' : 'paused'}</span></div>
        <div className="scene-note">MADE OF LETTERS & LOVE</div>
      </div>
      <CodeStream motion={motion} styleLabel={currentStyle.label} styleName={currentStyle.name} />
      <div className="dev-status" aria-hidden="true">
        <span><b>❯</b> npm run christmas -- --style={variant}</span>
        <span>✓ <strong>{visitors.total.toLocaleString()}</strong>명이 함께한 크리스마스 · ♥ {visitors.active}명 온라인</span>
      </div>
      <div className="toolbar">
        <div className="themes" aria-label="트리 색상">
          {palettes.map((p,i) => (
            <button key={p.name} className={theme === i ? 'selected' : ''} onClick={() => setTheme(i)} aria-pressed={theme === i}>
              <span style={{background:p.color}} />{p.name}
            </button>
          ))}
        </div>
        <div className="effects">
          {variant === 'apple' && (
            <>
              <div className="topper-toggle-group" role="group" aria-label="애플 꼭대기 장식">
                <button
                  className={`topper-btn red ${topper === 'red-apple' ? 'selected' : ''}`}
                  onClick={() => setTopper('red-apple')}
                  title="상단 꼭대기: 빨간 사과 (한입 베어문 애플)"
                  aria-pressed={topper === 'red-apple'}
                >
                  🍎 <span>빨간사과</span>
                </button>
                <button
                  className={`topper-btn white ${topper === 'white-apple' ? 'selected' : ''}`}
                  onClick={() => setTopper('white-apple')}
                  title="상단 꼭대기: 하얀 사과 (한입 베어문 애플)"
                  aria-pressed={topper === 'white-apple'}
                >
                  🍏 <span>하얀사과</span>
                </button>
              </div>
              <button className="apple-btn" onClick={() => { setReplay(v => v + 1); setTick(0); if (!motion) setMotion(true); }} title="애플 로고에서 트리로 흩어지는 모핑 다시보기" aria-label="애플 모핑 다시보기">
                 <span>모핑</span>
              </button>
            </>
          )}
          <button aria-pressed={snow} onClick={() => setSnow(!snow)}>❄ <span>눈</span></button>
          <button aria-pressed={burst > 0} onClick={() => setBurst(burst ? 0 : 1)}>✧ <span>선물</span></button>
          <button onClick={() => setMotion(!motion)} aria-label={motion ? '애니메이션 멈추기' : '애니메이션 재개'}>{motion ? 'Ⅱ' : '▷'}</button>
          <button onClick={() => { setReplay(v => v + 1); setTick(0); }} aria-label="트리 다시 만들기">↻</button>
        </div>
      </div>
    </section>
    <section className="bottom-row"><div className="music-player" data-music-controls><button className={`play ${!playing && autoplayPending ? 'pulse' : ''}`} aria-label={playing ? '캐럴 일시 정지' : '캐럴 재생'} onClick={toggleMusic}>{playing ? 'Ⅱ' : '▶'}</button><div className="song-info"><span className="eyebrow">A CHRISTMAS MUSIC BOX</span><select aria-label="캐럴 선택" value={song} onChange={e => { const n = Number(e.target.value); setSong(n); if (playing && box.current && !box.current.isClosed) { box.current.changeSong(n); } else { void startMusic(n); } }}>{songs.map((s,i) => <option value={i} key={s.title}>{s.title}</option>)}</select><small>{playing ? '직접 합성한 오르골 연주' : autoplayPending ? '화면 어디든 터치하거나 재생(▶)을 누르면 바로 시작돼요' : '재생을 눌러 크리스마스를 들어보세요'}</small></div><div className={'equalizer ' + (playing ? 'on' : '')} aria-hidden="true">{[0,1,2,3,4].map(i => <i key={i} style={{animationDelay:`${i * .16}s`}} />)}</div><label className="volume">♪<input aria-label="음악 음량" type="range" min="0" max="1" step=".01" value={volume} onChange={e => { const v = Number(e.target.value); setVolume(v); volumeRef.current = v; box.current?.volume(v); }} /></label></div><button className="edit-wish" onClick={() => setEditing(!editing)}>✎ <span>나만의 인사말</span> <span>↗</span></button></section>
    {editing && <form className="wish-editor" onSubmit={e => { e.preventDefault(); setEditing(false); }}><label htmlFor="recipient">{christmasConfig.greeting} 뒤에 올 문구</label><div><input id="recipient" maxLength={30} value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="LTC" /><button type="submit">완료</button></div></form>}
    {error && <p role="status" className="error">{error}</p>}
    <footer><span><span className="sig-gold">W</span>ishing <span className="sig-red">y</span>ou a <span className="sig-gold">s</span>eason full of little <span className="sig-gold">w</span>on<span className="sig-red">d</span>ers.</span><span>CRAFTED WITH CODE &amp; <b>♥</b> <a href="https://github.com/krazyeom/" target="_blank" rel="noopener noreferrer">kraz<span className="sig-red">y</span>eom</a> · <a href="https://github.com/krazyeom/christmasTree" target="_blank" rel="noopener noreferrer">GitHub ↗</a> · <a href="https://cafe.naver.com/hexenyang/" target="_blank" rel="noopener noreferrer">LTC ↗</a></span></footer>
  </main>;
}
