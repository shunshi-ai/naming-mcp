/**
 * Python-compatible rounding.
 *
 * ⚠️ This exists because `Math.round` and Python's `round()` disagree on exactly the
 * values this engine produces. Python 3 uses banker's rounding (round-half-to-even):
 * `round(82.5) == 82`. JavaScript rounds half away from zero: `Math.round(82.5) === 83`.
 *
 * Scores here land on `.5` constantly — a two-character 生肖 score of (100+65)/2 = 82.5,
 * a 数理 weighted sum of 86.5 — so the naive port disagreed with the production engine
 * on 63 of 200 names by exactly one point. Every rounding step in the scoring path must
 * go through this function, or the port silently scores names differently than the
 * live site.
 */
export function pyRound(x: number): number {
  const floor = Math.floor(x);
  const diff = x - floor;
  if (diff > 0.5) return floor + 1;
  if (diff < 0.5) return floor;
  // Exactly .5 — round to the even neighbour.
  return floor % 2 === 0 ? floor : floor + 1;
}
