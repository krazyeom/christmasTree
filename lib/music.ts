import { christmasConfig } from './config';

// Original synthesized arrangements of public-domain melodies. No sampled recordings.
type Note = [number, number];
const parse = (s: string): Note[] => s.split(' ').map(v => { const [n, d] = v.split(':'); return [Number(n), Number(d || 1)]; });
export const songs = [
  { title: 'Jingle Bells', subtitle: '징글벨 · James L. Pierpont, 1857', bpm: 116, notes: parse('76 76 76:2 76 76 76:2 76 79 72:1.5 74:0.5 76:4 77 77 77:1.5 77:0.5 77 76 76 76:0.5 76:0.5 76 74 74 76 74:2 79:2 76 76 76:2 76 76 76:2 76 79 72:1.5 74:0.5 76:4 77 77 77:1.5 77:0.5 77 76 76 76:0.5 76:0.5 79 79 77 74 72:4') },
  { title: 'Silent Night', subtitle: '고요한 밤 · Franz X. Gruber, 1818', bpm: 82, notes: parse('67:1.5 69:0.5 67 64:3 67:1.5 69:0.5 67 64:3 74:2 74 71:3 72:2 72 67:3 69:2 69 72:1.5 71:0.5 69 67:1.5 69:0.5 67 64:3 69:2 69 72:1.5 71:0.5 69 67:1.5 69:0.5 67 64:3 74:2 74 77:1.5 74:0.5 71 72:3 76:3 72 67 64 67:1.5 65:0.5 62 60:6') },
  { title: 'Deck the Halls', subtitle: '아름답게 장식하세 · Welsh traditional melody', bpm: 112, notes: parse('79:1.5 77:0.5 76 74 72 74 76 72 74:0.5 76:0.5 77:0.5 74:0.5 76:1.5 74:0.5 72 71 72:2 79:1.5 77:0.5 76 74 72 74 76 72 74:0.5 76:0.5 77:0.5 74:0.5 76:1.5 74:0.5 72 71 72:2 74:1.5 76:0.5 77 74 76:1.5 77:0.5 79 74 76:0.5 78:0.5 79 81:0.5 83:0.5 84 83 81 79:2 79:1.5 77:0.5 76 74 72 74 76 72 81:0.5 81:0.5 81:0.5 81:0.5 79:1.5 77:0.5 76 74 72:4') },
  { title: 'Joy to the World', subtitle: '기쁘다 구주 오셨네 · Lowell Mason, 1836', bpm: 108, notes: parse('84:2 83:1.5 81:0.5 79:3 77 76:2 74:2 72:3 79 81:3 81 83:3 83 84:6 84 84 83 81 79 79:1.5 77:0.5 76 84 84 83 81 79 79:1.5 77:0.5 76 76 76 76 76:0.5 77:0.5 79:3 77:0.5 76:0.5 74 74 74 74:0.5 76:0.5 77:3 76:0.5 74:0.5 72 84:2 81 79:1.5 77:0.5 76 77 76:2 74:2 72:4') },
];

export class MusicBox {
  private ctx: AudioContext;
  private gain: GainNode;
  private timer?: ReturnType<typeof setInterval>;
  private next = 0;
  private index = 0;
  private song = 0;
  private closed = false;
  private onSongChange?: (song: number) => void;

  constructor(volume: number, onSongChange?: (song: number) => void) {
    const AudioContextClass = typeof window !== 'undefined'
      ? (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
      : AudioContext;
    this.ctx = new AudioContextClass();
    this.gain = this.ctx.createGain();
    this.gain.gain.value = volume * 0.32;
    this.gain.connect(this.ctx.destination);
    this.onSongChange = onSongChange;
  }

  get isClosed(): boolean {
    return this.closed;
  }

  setOnSongChange(cb: (song: number) => void) {
    this.onSongChange = cb;
  }

  volume(v: number) {
    if (this.closed) return;
    this.gain.gain.setTargetAtTime(v * 0.32, this.ctx.currentTime, 0.1);
  }

  async play(song: number): Promise<boolean> {
    if (this.closed) return false;
    this.song = song;
    this.index = 0;

    if (this.ctx.state === 'suspended') {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          this.ctx.resume(),
          new Promise<void>(resolve => { timeout = setTimeout(resolve, 60); })
        ]);
      } catch {
        // 브라우저 오토플레이 제한 시 suspended 유지
      } finally {
        clearTimeout(timeout);
      }
    }

    if (this.closed || this.ctx.state !== 'running') return false;
    this.startLoop();
    return true;
  }

  /**
   * 재생 중인 곡을 즉각 다른 곡으로 전환합니다.
   */
  changeSong(song: number) {
    if (this.closed) return;
    this.song = song;
    this.index = 0;
    if (this.ctx.state === 'running') {
      this.startLoop();
    }
  }

  /**
   * 사용자 제스처(클릭, 터치) 이벤트의 동기 콜스택에서 호출해야만 브라우저 오토플레이 언락이 보장됩니다.
   */
  unlockAndPlay(song?: number): Promise<boolean> {
    if (this.closed) return Promise.resolve(false);
    if (typeof song === 'number') {
      this.song = song;
      this.index = 0;
    }

    const resumePromise = this.ctx.resume();

    return resumePromise
      .then(() => {
        if (this.closed || this.ctx.state !== 'running') return false;
        this.startLoop();
        return true;
      })
      .catch(() => false);
  }

  private startLoop() {
    clearInterval(this.timer);
    this.next = this.ctx.currentTime + 0.05;
    this.schedule();
    this.timer = setInterval(() => this.schedule(), 100);
  }

  private bell(midi: number, when: number, length: number, strength: number) {
    [1, 2, 3].forEach((harmonic, i) => {
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.frequency.value = 440 * 2 ** ((midi - 69) / 12) * harmonic;
      env.gain.setValueAtTime(0, when);
      env.gain.linearRampToValueAtTime(strength / (1 + i * 5), when + 0.008);
      env.gain.exponentialRampToValueAtTime(0.0001, when + length);
      osc.connect(env);
      env.connect(this.gain);
      osc.start(when);
      osc.stop(when + length + 0.02);
      osc.onended = () => { osc.disconnect(); env.disconnect(); };
    });
  }

  private schedule() {
    while (this.next < this.ctx.currentTime + 0.3) {
      const song = songs[this.song];
      const [note, beats] = song.notes[this.index];
      const duration = (beats * 60) / (song.bpm * christmasConfig.musicSpeed);

      this.bell(note, this.next, Math.max(0.6, duration * 1.7), 0.6);
      if (this.index % 4 === 0) {
        this.bell(this.index % 8 === 0 ? 48 : 55, this.next, 1.8, 0.3);
      }

      this.next += duration;
      this.index++;

      // 현재 곡이 모두 끝나면 0.8초 여운 후 다음 곡으로 자동 연속 재생
      if (this.index >= song.notes.length) {
        this.next += 0.8 / christmasConfig.musicSpeed;
        this.song = (this.song + 1) % songs.length;
        this.index = 0;
        this.onSongChange?.(this.song);
      }
    }
  }

  close() {
    this.closed = true;
    clearInterval(this.timer);
    if (this.ctx.state !== 'closed') {
      void this.ctx.close().catch(() => {});
    }
  }
}
