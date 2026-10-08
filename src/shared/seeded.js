// Deterministic randomness for DEMO data: the same listing/seller always gets the same demo numbers.
// Goes away together with the demo insights once Leonard's platform API is live.

/** Stable pseudo-random number in [0, 1) from a string. */
export function seeded(str) {
  let h = 2166136261;
  for (const c of String(str)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

/** Seeded PRNG (mulberry32): call the returned function repeatedly for a stable sequence per seed. */
export function rng(seedStr) {
  let a = Math.floor(seeded(seedStr) * 2 ** 32) ^ String(seedStr).length;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
