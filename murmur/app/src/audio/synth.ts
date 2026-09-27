import type { ActionKey } from '../../../shared/types';
import { ACTIONS } from '../../../shared/actions';

const FAMILY_FREQ: Record<string, number> = { up: 988, curious: 740, warm: 659, low: 392, tense: 554 };
const DAY_CHORD = [261.63, 329.63, 392.0, 493.88];
const NIGHT_CHORD = [220.0, 261.63, 329.63, 392.0];

/** All sound is synthesized. Nothing plays until the first user interaction. */
export class Synth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private padGain: GainNode | null = null;
  private padOsc: OscillatorNode[] = [];
  private padFilter: BiquadFilterNode | null = null;
  private rainGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private enabled = true;
  private popTimes: number[] = [];
  private nightMix = -1;

  get ready(): boolean {
    return this.ctx !== null;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 0.9 : 0;
    this.master.connect(ctx.destination);

    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 900;
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0;
    this.padGain.gain.setTargetAtTime(0.035, ctx.currentTime, 2);
    this.padFilter.connect(this.padGain).connect(this.master);
    for (let i = 0; i < 4; i++) {
      const o = ctx.createOscillator();
      o.type = i % 2 === 0 ? 'sine' : 'triangle';
      o.frequency.value = DAY_CHORD[i];
      o.detune.value = (i - 1.5) * 4;
      const g = ctx.createGain();
      g.gain.value = i === 3 ? 0.35 : 0.6;
      o.connect(g).connect(this.padFilter);
      o.start();
      this.padOsc.push(o);
    }
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(this.padFilter.frequency);
    lfo.start();

    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = this.noise;
    rainSrc.loop = true;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.value = 1400;
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;
    rainSrc.connect(rainFilter).connect(this.rainGain).connect(this.master);
    rainSrc.start();
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.08);
  }

  /** Blend the ambient pad between day and night voicings. */
  setNight(night: number) {
    if (!this.ctx || Math.abs(night - this.nightMix) < 0.02) return;
    this.nightMix = night;
    const t = this.ctx.currentTime;
    this.padOsc.forEach((o, i) => o.frequency.setTargetAtTime(DAY_CHORD[i] + (NIGHT_CHORD[i] - DAY_CHORD[i]) * night, t, 3));
    this.padFilter?.frequency.setTargetAtTime(900 - night * 350, t, 3);
  }

  setRain(intensity: number) {
    if (!this.ctx || !this.rainGain) return;
    this.rainGain.gain.setTargetAtTime(intensity * 0.07, this.ctx.currentTime, 0.6);
  }

  pop(action: ActionKey) {
    if (!this.ctx || !this.master || !this.enabled) return;
    const now = performance.now();
    this.popTimes = this.popTimes.filter((t) => now - t < 1000);
    if (this.popTimes.length >= 12) return;
    this.popTimes.push(now);
    const fam = ACTIONS[action].family;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const f = FAMILY_FREQ[fam] * (0.94 + Math.random() * 0.12);
    const o = ctx.createOscillator();
    o.type = fam === 'tense' ? 'triangle' : 'sine';
    o.frequency.setValueAtTime(f, t);
    if (fam === 'curious') o.frequency.exponentialRampToValueAtTime(f * 1.35, t + 0.09);
    else if (fam === 'low') o.frequency.exponentialRampToValueAtTime(f * 0.8, t + 0.1);
    else o.frequency.exponentialRampToValueAtTime(f * 1.08, t + 0.05);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.15);
  }

  whoosh() {
    if (!this.ctx || !this.master || !this.noise || !this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(2200, t + 0.35);
    bp.frequency.exponentialRampToValueAtTime(700, t + 0.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.7);
  }

  chime(up = true) {
    if (!this.ctx || !this.master || !this.enabled) return;
    const ctx = this.ctx;
    const notes = up ? [659.25, 783.99, 1046.5] : [523.25, 392.0];
    notes.forEach((f, i) => {
      const t = ctx.currentTime + i * 0.11;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g).connect(this.master!);
      o.start(t);
      o.stop(t + 0.55);
    });
  }
}

export const synth = new Synth();
