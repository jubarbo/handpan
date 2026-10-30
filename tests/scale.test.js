import { describe, expect, it } from 'vitest';
import { D_KURD_EXTENDED, noteToFrequency } from '../src/sound/scale.js';

describe('noteToFrequency', () => {
  it('uses A4 = 440 Hz equal temperament', () => {
    expect(noteToFrequency('A4')).toBeCloseTo(440, 6);
    expect(noteToFrequency('A3')).toBeCloseTo(220, 6);
    expect(noteToFrequency('D3')).toBeCloseTo(146.832, 2);
    expect(noteToFrequency('C6')).toBeCloseTo(1046.502, 2);
  });

  it('supports flats and sharps', () => {
    expect(noteToFrequency('Bb3')).toBeCloseTo(noteToFrequency('A#3'), 9);
    expect(noteToFrequency('Bb3')).toBeCloseTo(233.082, 2);
  });

  it('rejects invalid note names', () => {
    expect(() => noteToFrequency('H3')).toThrow('Invalid note name: H3');
    expect(() => noteToFrequency('A')).toThrow('Invalid note name: A');
  });
});

describe('D Kurd extended scale', () => {
  it('has a D3 ding, 10 outer and 7 inner notes', () => {
    expect(D_KURD_EXTENDED.ding).toBe('D3');
    expect(D_KURD_EXTENDED.outer).toEqual(['A3', 'Bb3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'Bb4', 'C5']);
    expect(D_KURD_EXTENDED.inner).toEqual(['D5', 'E5', 'F5', 'G5', 'A5', 'Bb5', 'C6']);
  });
});
