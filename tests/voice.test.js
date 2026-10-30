import { describe, expect, it } from 'vitest';
import { createVoiceSpec } from '../src/sound/voice.js';

const tonal = (spec) => spec.partials.filter((p) => p.role !== 'shimmer');

describe('createVoiceSpec', () => {
  it('tunes partials like a handpan field: fundamental, octave, compound fifth', () => {
    const spec = createVoiceSpec({ frequency: 220 });
    const ratios = [...new Set(tonal(spec).map((p) => p.ratio))];
    expect(ratios).toEqual([1, 2, 3]);
  });

  it('detunes the fundamental pair slightly to produce the characteristic beating', () => {
    const fundamentals = createVoiceSpec({ frequency: 220 }).partials.filter((p) => p.ratio === 1);
    expect(fundamentals).toHaveLength(2);
    const beat = Math.abs(fundamentals[0].detuneHz - fundamentals[1].detuneHz);
    expect(beat).toBeGreaterThan(0.2);
    expect(beat).toBeLessThan(1.5);
  });

  it('sustains low notes longer than high notes, and upper partials die first', () => {
    const low = createVoiceSpec({ frequency: 146.83 });
    const high = createVoiceSpec({ frequency: 1046.5 });
    const decay = (spec, ratio) => spec.partials.find((p) => p.ratio === ratio).decay;
    expect(decay(low, 1)).toBeGreaterThan(decay(high, 1));
    expect(decay(low, 1)).toBeGreaterThan(5);
    expect(decay(low, 2)).toBeLessThan(decay(low, 1));
    expect(decay(low, 3)).toBeLessThan(decay(low, 2));
  });

  it('brightens the timbre when the field is struck near its border', () => {
    const center = createVoiceSpec({ frequency: 220, brightness: 0 });
    const edge = createVoiceSpec({ frequency: 220, brightness: 1 });
    const gain = (spec, ratio) => spec.partials.find((p) => p.ratio === ratio).gain;
    expect(gain(edge, 2)).toBeGreaterThan(gain(center, 2));
    expect(gain(edge, 3)).toBeGreaterThan(gain(center, 3));
  });

  it('scales the level with velocity', () => {
    const soft = createVoiceSpec({ frequency: 220, velocity: 0.3 });
    const hard = createVoiceSpec({ frequency: 220, velocity: 1 });
    expect(hard.partials[0].gain).toBeGreaterThan(soft.partials[0].gain);
    expect(hard.strike.gain).toBeGreaterThan(soft.strike.gain);
  });

  it('adds a stronger cavity (Helmholtz) thump to the ding', () => {
    const ding = createVoiceSpec({ frequency: 146.83, ring: 'ding' });
    const note = createVoiceSpec({ frequency: 220, ring: 'outer' });
    expect(ding.cavity.gain).toBeGreaterThan(note.cavity.gain);
  });
});
