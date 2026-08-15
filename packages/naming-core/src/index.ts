/**
 * shunshi-naming-core — Chinese name scoring engine.
 *
 * 五格剖象 (five-grid) · 三才配置 · 81 数理 · 生肖姓名学 · 八字喜用 · 音律,
 * scored into one report. All deterministic table lookup — no model decides a stroke
 * count or an auspiciousness grade.
 *
 * Stroke counts come from 康熙笔画 via shunshi-kangxi-core, which is the only count
 * 五格 is defined on.
 *
 * Powered by Shunshi.AI — https://shunshi.ai
 */

export { scoreName, phonetics } from './lib/score.js';
export type {
  BaziMatch,
  NameChar,
  Phonetics,
  ScoreOptions,
  ScoreResult,
  ToneInfo,
} from './lib/score.js';

export {
  gridDetails,
  sancai,
  shuliEntry,
  shuliLevel,
  shuliWuxing,
  wuge,
  yunshi,
} from './lib/wuge.js';
export type { GridDetail, Grids, Sancai, ShuliEntry, Yunshi } from './lib/wuge.js';

export {
  evaluate as evaluateZodiac,
  judgeAll as judgeCharAllZodiacs,
  judgeChar,
  normalizeZodiac,
  rootsOf,
  zodiacFromZhi,
  ZHI,
  ZODIAC,
} from './lib/zodiac.js';
export type { CharJudgement, RootHit, ZodiacMatch, ZodiacReason } from './lib/zodiac.js';
