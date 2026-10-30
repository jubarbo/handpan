import { createVoiceSpec } from './voice.js';

const MAX_VOICES = 28;
const T60_TO_TAU = 1 / Math.log(1000);

/**
 * Web Audio synthesis engine. Must be unlocked from a user gesture
 * (browsers, especially iOS Safari, keep audio suspended until then).
 */
export function createSoundEngine() {
  let ctx = null;
  let input = null;
  let noiseBuffer = null;
  const voices = [];

  function unlock() {
    if (!ctx) {
      // Play through the iOS mute switch, like a music app.
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
      ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
      input = buildMasterChain(ctx);
      noiseBuffer = createNoiseBuffer(ctx, 0.25);
      const silent = ctx.createBufferSource();
      silent.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      silent.connect(ctx.destination);
      silent.start();
    }
    if (ctx.state !== 'running') ctx.resume();
    return ctx;
  }

  /** Plays one strike. `pan` in [-1, 1]. */
  function strike({ id, frequency, ring, velocity, brightness, pan = 0 }) {
    if (!ctx) return;
    const now = ctx.currentTime + 0.005;
    damp(voices.filter((v) => v.id === id && !v.damped), now);

    const spec = createVoiceSpec({ frequency, ring, velocity, brightness });
    const out = ctx.createGain();
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    out.connect(panner).connect(input);

    const sources = [];
    let end = now;
    for (const p of spec.partials) {
      const osc = ctx.createOscillator();
      osc.frequency.value = frequency * p.ratio + p.detuneHz;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(p.gain, now + p.attack);
      env.gain.setTargetAtTime(0, now + p.attack, p.decay * T60_TO_TAU);
      osc.connect(env).connect(out);
      osc.start(now);
      const stopAt = now + p.attack + p.decay + 0.1;
      osc.stop(stopAt);
      end = Math.max(end, stopAt);
      sources.push(osc);
    }
    sources.push(playStrikeNoise(spec.strike, out, now));
    sources.push(playCavity(spec.cavity, out, now));

    const voice = { id, out, sources, end };
    voices.push(voice);
    // The fundamental rings longest, so its end releases the whole voice.
    sources[0].onended = () => {
      out.disconnect();
      const index = voices.indexOf(voice);
      if (index >= 0) voices.splice(index, 1);
    };
    const ringing = voices.filter((v) => !v.damped);
    if (ringing.length > MAX_VOICES) damp([ringing[0]], now);
  }

  function playStrikeNoise({ gain, frequency, q, duration }, out, now) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, now);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(filter).connect(env).connect(out);
    src.start(now);
    src.stop(now + duration + 0.02);
    return src;
  }

  function playCavity({ gain, frequency, decay }, out, now) {
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(frequency * 1.08, now);
    osc.frequency.exponentialRampToValueAtTime(frequency, now + 0.08);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(gain, now + 0.008);
    env.gain.setTargetAtTime(0, now + 0.008, decay * T60_TO_TAU);
    osc.connect(env).connect(out);
    osc.start(now);
    osc.stop(now + decay + 0.1);
    return osc;
  }

  /** A re-struck field stops ringing first, like a hand resetting the steel. */
  function damp(list, now) {
    for (const voice of list) {
      voice.damped = true;
      voice.out.gain.setTargetAtTime(0, now, 0.025);
      for (const s of voice.sources) {
        try {
          s.stop(now + 0.15);
        } catch {
          /* already stopped */
        }
      }
    }
  }

  return { unlock, strike, get context() { return ctx; } };
}

function buildMasterChain(ctx) {
  const input = ctx.createGain();
  input.gain.value = 0.9;

  const reverb = ctx.createConvolver();
  reverb.buffer = createImpulseResponse(ctx, 3.2);
  const wet = ctx.createGain();
  wet.gain.value = 0.32;
  const dry = ctx.createGain();
  dry.gain.value = 0.85;

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -16;
  compressor.knee.value = 12;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.25;

  input.connect(dry).connect(compressor);
  input.connect(reverb).connect(wet).connect(compressor);
  compressor.connect(ctx.destination);
  return input;
}

function createNoiseBuffer(ctx, seconds) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Stereo room tail: decorrelated noise, exponential decay, darker as it fades. */
function createImpulseResponse(ctx, seconds) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const smoothing = 0.2 + 0.75 * t;
      lp = lp * smoothing + (Math.random() * 2 - 1) * (1 - smoothing);
      data[i] = lp * (1 - t) ** 2.2 * (i < ctx.sampleRate * 0.012 ? i / (ctx.sampleRate * 0.012) : 1);
    }
  }
  return buffer;
}
