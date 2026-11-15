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
  constructor(volume: number) { this.ctx = new AudioContext(); this.gain = this.ctx.createGain(); this.gain.gain.value = volume * .32; this.gain.connect(this.ctx.destination); }
  volume(v: number) { this.gain.gain.setTargetAtTime(v * .32, this.ctx.currentTime, .1); }
  async play(song: number): Promise<boolean> {
    if (this.closed) return false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([this.ctx.resume(), new Promise<void>(resolve => { timeout = setTimeout(resolve, 700); })]);
    } finally { clearTimeout(timeout); }
    if (this.closed || this.ctx.state !== 'running') return false;
    clearInterval(this.timer);
    this.song = song; this.index = 0; this.next = this.ctx.currentTime + .05;
    this.schedule(); this.timer = setInterval(() => this.schedule(), 100);
    return true;
  }

  private bell(midi: number, when: number, length: number, strength: number) {
    [1, 2, 3].forEach((harmonic, i) => { const osc = this.ctx.createOscillator(); const env = this.ctx.createGain(); osc.frequency.value = 440 * 2 ** ((midi - 69) / 12) * harmonic; env.gain.setValueAtTime(0, when); env.gain.linearRampToValueAtTime(strength / (1 + i * 5), when + .008); env.gain.exponentialRampToValueAtTime(.0001, when + length); osc.connect(env); env.connect(this.gain); osc.start(when); osc.stop(when + length + .02); osc.onended = () => { osc.disconnect(); env.disconnect(); }; });
  }
  private schedule() { const song = songs[this.song]; while (this.next < this.ctx.currentTime + .3) { const [note, beats] = song.notes[this.index]; const duration = beats * 60 / (song.bpm * christmasConfig.musicSpeed); this.bell(note, this.next, Math.max(.6, duration * 1.7), .6); if (this.index % 4 === 0) this.bell(this.index % 8 === 0 ? 48 : 55, this.next, 1.8, .3); this.next += duration; this.index = (this.index + 1) % song.notes.length; if (!this.index) this.next += .9 / christmasConfig.musicSpeed; } }
  close() { this.closed = true; clearInterval(this.timer); if (this.ctx.state !== 'closed') void this.ctx.close().catch(() => {}); }
}
