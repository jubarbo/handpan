const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NOTE_PATTERN = /^([A-G])(#|b)?(-?\d)$/;

/** Converts a scientific pitch name (e.g. "Bb3", "C#4") to Hz, A4 = 440 Hz. */
export function noteToFrequency(name) {
  const match = NOTE_PATTERN.exec(name);
  if (!match) throw new Error(`Invalid note name: ${name}`);
  const [, letter, accidental, octave] = match;
  const offset = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  const midi = 12 * (Number(octave) + 1) + SEMITONES[letter] + offset;
  return 440 * 2 ** ((midi - 69) / 12);
}

/** D Kurd (D natural minor) extended over a mutant-style top: ding, outer ring, inner ring. */
export const D_KURD_EXTENDED = Object.freeze({
  name: 'D Kurd 18',
  ding: 'D3',
  outer: ['A3', 'Bb3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'Bb4', 'C5'],
  inner: ['D5', 'E5', 'F5', 'G5', 'A5', 'Bb5', 'C6'],
});
