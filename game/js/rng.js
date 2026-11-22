// Seeded random numbers (mulberry32) so screenshot states are deterministic
// and a fixed seed always replays the same match.
export function createRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle of a copy, driven by the given rng. */
export function shuffle(array, rng) {
  const out = array.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/** Pick one element of `array` with the rng, or null when it is empty. */
export function pick(array, rng) {
  if (array.length === 0) return null;
  return array[Math.floor(rng() * array.length)];
}
