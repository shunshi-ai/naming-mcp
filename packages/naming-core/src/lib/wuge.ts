/**
 * 五格剖象 — the Kumasaki (熊崎健翁, 1928) five-grid system: grids, 三才, the 81
 * numerological entries, and the three derived fortunes.
 *
 * Everything here is deterministic table lookup. No model is involved in deciding a
 * stroke count or an auspiciousness grade; language models only ever write prose on
 * top of these values.
 */

import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data');

function readGzipJson<T>(file: string): T {
  return JSON.parse(gunzipSync(readFileSync(join(DATA_DIR, file))).toString('utf8')) as T;
}

export interface ShuliEntry {
  level: string;
  poem: string;
  text: string;
  keywords: string;
  level_note?: string;
}

let _shuli: Record<string, ShuliEntry> | null = null;
let _sancai: Record<string, { level: string; text: string }> | null = null;
let _yunshi: Record<string, { level: string; text: string }> | null = null;

/**
 * The 81 numerological entries (grade + verse + explanation + keywords).
 *
 * ⚠️ The grade and the explanatory text live in the **same file on purpose**. They were
 * once separate — a hard-coded set of grades in code, the prose added later — and two
 * sources of truth drift: you end up printing "大德奏功" next to a verdict of 凶.
 */
function shuli(): Record<string, ShuliEntry> {
  if (!_shuli) _shuli = readGzipJson<Record<string, ShuliEntry>>('shuli-81.json.gz');
  return _shuli;
}

/**
 * The 125 三才 configurations. **Looked up, not derived.**
 *
 * ⚠️ This was once computed from 五行 generation/restraint rules, and that was wrong.
 * End-to-end testing against industry reference tools put 8 of 10 sample names in a
 * different grade. The clearest counter-example is 木金水: by the generation rules it is
 * one restraint plus one generation (半吉), yet independent reference sources grade it
 * 大凶. What the table encodes is centuries of accumulated judgements, not a derivable
 * rule.
 *
 * Grades were taken from a complete 125-entry public table and cross-checked against a
 * second independent source on a 34-entry sample with zero disagreement. Only the
 * **grades** are third-party; all explanatory prose here is our own.
 */
function sancaiTable(): Record<string, { level: string; text: string }> {
  if (!_sancai) _sancai = readGzipJson<Record<string, { level: string; text: string }>>('sancai-125.json.gz');
  return _sancai;
}

/** 25 element pairs × 3 fortunes = 75 graded entries. */
function yunshiTable(): Record<string, { level: string; text: string }> {
  if (!_yunshi) _yunshi = readGzipJson<Record<string, { level: string; text: string }>>('yunshi-75.json.gz');
  return _yunshi;
}

/** Full numerological entry for a number. Above 81, subtract 80 per convention. */
export function shuliEntry(n: number): ShuliEntry {
  const k = n > 81 ? n - 80 : n;
  return shuli()[String(k)];
}

/**
 * Auspiciousness grade (Kumasaki lineage; 42/49 are contested between lineages and are
 * filed as 半吉 rather than force-graded).
 *
 * Five tiers: 大吉 / 吉 / 半吉 / 凶 / 大凶. It was three for a while, which flattened 大吉
 * into 吉 and 大凶 into 凶 — that distorted 48 of 80 sampled grades, because the extremes
 * are exactly where the 81-number system carries its information.
 */
export function shuliLevel(n: number): string {
  return shuliEntry(n).level;
}

/** 数理五行 by last digit: 1,2 木 · 3,4 火 · 5,6 土 · 7,8 金 · 9,0 水. */
export function shuliWuxing(n: number): string {
  return ({ 1: '木', 2: '木', 3: '火', 4: '火', 5: '土', 6: '土', 7: '金', 8: '金', 9: '水', 0: '水' } as Record<number, string>)[n % 10];
}

const SHENG: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const KE: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

/**
 * Each grid governs a stretch of life (Kumasaki convention). 天格 is fixed by the
 * surname and cannot be changed, so it carries no verdict and no score.
 */
const GRID_ROLE: Record<string, string> = {
  tian: '祖运（不论吉凶）',
  ren: '主运',
  di: '前运',
  wai: '副运',
  zong: '后运',
};

export interface Grids {
  tian: number;
  ren: number;
  di: number;
  wai: number;
  zong: number;
}

/** Five-grid calculation. Handles single/compound surname × single/double given name. */
export function wuge(surnameStrokes: number[], givenStrokes: number[]): Grids {
  const s = surnameStrokes;
  const g = givenStrokes;
  const tian = s.length === 1 ? s[0] + 1 : s[0] + s[1];
  const ren = s[s.length - 1] + g[0];
  const di = g.length === 1 ? g[0] + 1 : g[0] + g[1];
  const zong = s.reduce((a, b) => a + b, 0) + g.reduce((a, b) => a + b, 0);

  let wai: number;
  if (s.length === 1 && g.length === 1) wai = 2;
  else if (s.length === 1) wai = g[g.length - 1] + 1;
  else if (g.length === 1) wai = s[0] + 1;
  else wai = s[0] + g[g.length - 1];

  return { tian, ren, di, wai, zong };
}

export interface Sancai {
  combo: string;
  tian_ren: string;
  ren_di: string;
  level: string;
  text: string;
}

/** 三才 configuration and grade (**table lookup**; the relations are still derived, for display). */
export function sancai(tian: number, ren: number, di: number): Sancai {
  const wx = [shuliWuxing(tian), shuliWuxing(ren), shuliWuxing(di)];

  const rel = (a: string, b: string): string => {
    if (a === b) return '同';
    if (SHENG[a] === b) return '生'; // a generates b
    if (SHENG[b] === a) return '被生'; // b generates a
    if (KE[a] === b) return '克'; // a restrains b
    return '被克';
  };

  const combo = wx.join('');
  const entry = sancaiTable()[combo];
  // The table is complete (125/125); a miss can only mean the data file was damaged.
  // Better to fail loudly than to silently degrade.
  if (!entry) {
    throw new Error(`三才配置表缺 ${combo}（应有 125 条，请检查 sancai-125.json.gz）`);
  }

  return {
    combo,
    tian_ren: rel(wx[0], wx[1]),
    ren_di: rel(wx[1], wx[2]),
    level: entry.level,
    text: entry.text,
  };
}

/**
 * The three fortunes. 人格 is the subject, judged against 地格 / 天格 / 外格 in turn.
 * This is a standard part of 五格剖象 — giving "人格 37 吉" without these three is
 * telling half the story.
 */
const YUNSHI_DEFS: Array<[string, keyof Grids, string]> = [
  ['基础运', 'di', '人格与地格 —— 根基是否安稳，住所、健康、下属助力'],
  ['成功运', 'tian', '人格与天格 —— 上进是否顺遂，长上、家世、时势的助力'],
  ['社交运', 'wai', '人格与外格 —— 人际是否融洽，外在环境与他人对待'],
];

const YUNSHI_KEY: Record<string, string> = { 基础运: 'base', 成功运: 'succ', 社交运: 'soc' };

/** Relation of `me` to `other`, from `me`'s point of view. */
function wxRelation(me: string, other: string): string {
  if (me === other) return '比和';
  if (SHENG[other] === me) return '生我';
  if (SHENG[me] === other) return '我生';
  if (KE[me] === other) return '我克';
  return '克我';
}

export interface Yunshi {
  name: string;
  basis: string;
  combo: string;
  relation: string;
  level: string;
  text: string;
}

/**
 * The three fortunes for a set of grids.
 *
 * ⚠️ **Looked up, not derived from generation/restraint.** The evidence is direct: for
 * 基础运, 木木/火火/土土 grade auspicious while 金金/水水 grade inauspicious — 金金 as
 * "過於堅剛乏同化力", 水水 as "流動飄零" — all five being 比和. The same relation lands
 * differently depending on which element it is, which is elemental nature, not a
 * generation rule. A one-size-fits-all implementation by relation disagreed with the
 * industry reading on 16 of 30 sampled cases.
 */
export function yunshi(grids: Grids): Yunshi[] {
  const renWx = shuliWuxing(grids.ren);
  return YUNSHI_DEFS.map(([name, key, basis]) => {
    const otherWx = shuliWuxing(grids[key]);
    const e = yunshiTable()[`${YUNSHI_KEY[name]}|${renWx}|${otherWx}`];
    return {
      name,
      basis,
      combo: `${renWx}/${otherWx}`,
      relation: wxRelation(renWx, otherWx),
      level: e.level,
      text: e.text,
    };
  });
}

export interface GridDetail {
  num: number;
  wuxing: string;
  level: string;
  poem: string;
  text: string;
  keywords: string;
  role: string;
  level_note?: string;
}

/** Per-grid detail: the number alone means nothing to a reader without the reading. */
export function gridDetails(grids: Grids): Record<string, GridDetail> {
  const out: Record<string, GridDetail> = {};
  for (const [k, v] of Object.entries(grids) as Array<[keyof Grids, number]>) {
    const e = shuliEntry(v);
    out[k] = {
      num: v,
      wuxing: shuliWuxing(v),
      level: e.level,
      poem: e.poem,
      text: e.text,
      keywords: e.keywords,
      role: GRID_ROLE[k],
      ...(e.level_note ? { level_note: e.level_note } : {}),
    };
  }
  return out;
}

export { GRID_ROLE };
