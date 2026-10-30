/**
 * Pure description of one handpan strike: modal partials, strike noise and
 * cavity response. The audio engine turns it into Web Audio nodes.
 *
 * `decay` values are T60 times in seconds (time to fall 60 dB).
 */
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export function createVoiceSpec({ frequency, ring = 'outer', velocity = 0.8, brightness = 0.4 }) {
  const v = clamp(velocity, 0.05, 1);
  const b = clamp(brightness, 0, 1);
  const level = 0.22 * v ** 1.3;
  const sustain = clamp(7.2 * (146.83 / frequency) ** 0.42, 2.4, 8);

  const partials = [
    // Fundamental as a slightly detuned pair: the slow "breathing" of a real field.
    { role: 'fundamental', ratio: 1, detuneHz: -0.22, gain: level * 0.55, decay: sustain, attack: 0.012 },
    { role: 'fundamental', ratio: 1, detuneHz: 0.2 + 0.1 * (frequency / 1000), gain: level * 0.5, decay: sustain * 0.94, attack: 0.012 },
    { role: 'octave', ratio: 2, detuneHz: 0.35, gain: level * (0.28 + 0.32 * b), decay: sustain * 0.58, attack: 0.006 },
    { role: 'fifth', ratio: 3, detuneHz: -0.5, gain: level * (0.1 + 0.22 * b), decay: sustain * 0.36, attack: 0.004 },
    // Untuned high modes: a short metallic shimmer at the attack.
    { role: 'shimmer', ratio: 4.07, detuneHz: 0, gain: level * 0.06 * (0.4 + b), decay: 0.35, attack: 0.002 },
    { role: 'shimmer', ratio: 5.43, detuneHz: 0, gain: level * 0.035 * (0.4 + b), decay: 0.22, attack: 0.002 },
  ].filter((p) => frequency * p.ratio < 16000);

  return {
    frequency,
    partials,
    strike: { gain: 0.05 * v ** 1.5 * (0.6 + 0.6 * b), frequency: 1800 + 2200 * b, q: 0.9, duration: 0.03 },
    cavity: { gain: (ring === 'ding' ? 0.22 : 0.035) * v, frequency: 92, decay: 0.9 },
  };
}
