// Copper Bay — synthesized audio. One clear job: WebAudio beeps, booms, sirens, radio.
import { RADIO } from './config.js';

export class AudioEngine {
  constructor() {
    this.ctx = null; this.master = null; this.muted = false; this.station = 0;
    this.radioTimer = 0; this.noteIdx = 0; this.engineOsc = null; this.engineGain = null;
  }
  ensure() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch { this.ctx = null; }
  }
  resume() { this.ensure(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.5; }
  cycleStation() { this.station = (this.station + 1) % RADIO.length; this.noteIdx = 0; return RADIO[this.station]; }
  _tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur);
  }
  _noise(dur, vol, lowpass) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass || 1200;
    const g = this.ctx.createGain(); g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t);
  }
  shoot(kind) {
    if (kind === 'rpg') { this._noise(0.5, 0.5, 600); this._tone(90, 0.4, 'sawtooth', 0.2, 40); }
    else if (kind === 'shotgun') { this._noise(0.25, 0.45, 900); }
    else if (kind === 'smg' || kind === 'rifle') { this._noise(0.08, 0.22, 2400); }
    else { this._noise(0.12, 0.3, 1800); }
  }
  explosion() { this._noise(0.9, 0.6, 400); this._tone(60, 0.8, 'sine', 0.35, 28); }
  siren() { this._tone(700, 0.5, 'sine', 0.05, 1100); }
  crash() { this._noise(0.3, 0.4, 800); }
  pickup() { this._tone(660, 0.1, 'sine', 0.15); this._tone(990, 0.14, 'sine', 0.15); }
  mission() { [523, 659, 784].forEach((f, i) => setTimeout(() => this._tone(f, 0.16, 'square', 0.12), i * 90)); }
  fail() { [392, 311, 233].forEach((f, i) => setTimeout(() => this._tone(f, 0.2, 'square', 0.1), i * 120)); }
  engine(on, speed01) {
    if (!this.ctx || this.muted) return;
    if (on && !this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator(); this.engineGain = this.ctx.createGain();
      this.engineOsc.type = 'sawtooth'; this.engineOsc.frequency.value = 70;
      this.engineGain.gain.value = 0.03;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
      this.engineOsc.connect(f); f.connect(this.engineGain); this.engineGain.connect(this.master);
      this.engineOsc.start();
    } else if (!on && this.engineOsc) {
      try { this.engineOsc.stop(); } catch { /* already stopped */ }
      this.engineOsc = null; this.engineGain = null;
    }
    if (this.engineOsc) {
      this.engineOsc.frequency.value = 60 + speed01 * 140;
      this.engineGain.gain.value = 0.02 + speed01 * 0.05;
    }
  }
  // Tiny chiptune: one note per beat from a pentatonic walk, station mood sets scale.
  radioTick(dt, driving) {
    if (!this.ctx || this.muted || !driving) return;
    const st = RADIO[this.station];
    this.radioTimer -= dt;
    if (this.radioTimer > 0) return;
    this.radioTimer = 60 / st.bpm / 2;
    const scale = st.mood === 'drive' ? [0, 3, 5, 7, 10] : st.mood === 'night' ? [0, 2, 3, 7, 8] : [0, 2, 4, 7, 9];
    this.noteIdx += [1, 1, 2, -1, 1, 2, 1, -2][this.noteIdx % 8] || 1;
    const deg = scale[((this.noteIdx % scale.length) + scale.length) % scale.length];
    const oct = 1 + (Math.floor(this.noteIdx / scale.length) % 2);
    this._tone(st.root * oct * Math.pow(2, deg / 12), 0.22, 'triangle', 0.06);
  }
}
