// Synthesised sound effects via WebAudio: no audio files, nothing fetched.
// Every effect is a short oscillator phrase; the win is a little arpeggio.
let context = null;
let muted = false;

/** Create (or reuse) the audio context on the first user gesture. */
export function ensureAudio() {
  if (context === null) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    context = new AudioContext();
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function tone(freq, start, duration, kind, volume) {
  if (muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = kind;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.05);
}

/** Play the named effect: play, hit, shield, heal, draw, triad, win, lose. */
export function playSound(name) {
  if (muted) return;
  switch (name) {
    case 'play':
      tone(520, 0, 0.12, 'triangle', 0.18);
      tone(780, 0.05, 0.1, 'triangle', 0.12);
      break;
    case 'hit':
      tone(180, 0, 0.18, 'sawtooth', 0.2);
      tone(90, 0.02, 0.2, 'square', 0.12);
      break;
    case 'shield':
      tone(340, 0, 0.15, 'sine', 0.18);
      tone(510, 0.06, 0.18, 'sine', 0.12);
      break;
    case 'heal':
      tone(660, 0, 0.14, 'sine', 0.15);
      tone(880, 0.08, 0.18, 'sine', 0.12);
      break;
    case 'draw':
      tone(440, 0, 0.07, 'triangle', 0.1);
      tone(587, 0.05, 0.07, 'triangle', 0.1);
      break;
    case 'triad':
      tone(523, 0, 0.1, 'triangle', 0.15);
      tone(659, 0.08, 0.1, 'triangle', 0.15);
      tone(784, 0.16, 0.16, 'triangle', 0.15);
      break;
    case 'win':
      [523, 659, 784, 1047, 1319].forEach((freq, i) => tone(freq, i * 0.11, 0.3, 'triangle', 0.18));
      break;
    case 'lose':
      [392, 330, 262, 196].forEach((freq, i) => tone(freq, i * 0.14, 0.3, 'sine', 0.15));
      break;
    default:
      tone(440, 0, 0.08, 'triangle', 0.1);
      break;
  }
}
