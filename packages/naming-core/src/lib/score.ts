/**
 * 测名主入口 — combines 五格数理, 三才, 八字喜用 and 生肖 into one scored report.
 */

import { definitionOf, resolveChar, structOf, toBopomofo } from 'shunshi-kangxi-core';
import { pyRound } from './round.js';
import * as zodiacLib from './zodiac.js';
import {
  gridDetails,
  sancai,
  wuge,
  yunshi,
  type GridDetail,
  type Grids,
  type Sancai,
  type Yunshi,
} from './wuge.js';

/**
 * Surnames read differently as a surname than as an ordinary character.
 *
 * The character table can only store one primary reading per character, but which
 * reading applies depends on whether the character sits in the surname or the given
 * name. Bulk-correcting polyphone readings against a pinyin library once changed
 * 任 rén→rèn, 区 ōu→qū, 朴 piáo→pǔ and 单 chán→dān — all of them to the "as a given
 * name" reading. Position is only known inside the per-character loop below, so the
 * override lives here rather than in the table.
 *
 * Inclusion standard: **uncontested cases only**. 乐 (乐嘉 lè vs the surname yuè) and
 * 隗 (kuí/wěi) vary by family and are deliberately absent — better to use the primary
 * reading than to change someone's own surname on them. 覃 is the one judgement call:
 * qín (mainland majority, especially 广西) and tán (Taiwan and some families) coexist;
 * qín was chosen on user distribution.
 */
const SURNAME_PY: Record<string, string> = {
  任: 'rén', 单: 'shàn', 解: 'xiè', 区: 'ōu', 仇: 'qiú',
  朴: 'piáo', 查: 'zhā', 曾: 'zēng', 华: 'huà', 繁: 'pó',
  员: 'yùn', 折: 'shé', 缪: 'miào', 阚: 'kàn', 訾: 'zī',
  种: 'chóng', 冼: 'xiǎn', 覃: 'qín',
};

const TONE_MARKS: Array<[string, number]> = [
  ['āēīōūǖ', 1], ['áéíóúǘ', 2], ['ǎěǐǒǔǚ', 3], ['àèìòùǜ', 4],
];
const TONE_NAME: Record<number, string> = {
  1: '阴平', 2: '阳平', 3: '上声', 4: '去声', 0: '轻声',
};

/** Tone from a tone-marked syllable. No mark = 轻声/unmarked (0). */
function toneOf(py: string | null | undefined): number {
  if (!py) return 0;
  for (const [marks, t] of TONE_MARKS) {
    for (const c of marks) if (py.includes(c)) return t;
  }
  return 0;
}

export interface ToneInfo {
  char: string;
  py: string | null;
  tone: number;
  tone_name: string;
}

export interface Phonetics {
  tones: ToneInfo[];
  level: string;
  note: string;
}

/**
 * 音律 — per-character tones plus one sentence on how the name reads aloud.
 *
 * Pure rules: three identical tones is the most awkward (all-上声 especially, since
 * Mandarin tone sandhi makes it harder still); variation reads well. Homophone
 * blacklists are out of scope — that needs both Mandarin and Cantonese corpora.
 *
 * ⚠️ The note must **state the tones inside the sentence**. It used to read "声调各不
 * 相同，抑扬有致，读来顺口" — a bare conclusion, with the facts (which character, which
 * tone) sitting in the `tones` array where the reader of that sentence cannot see them.
 * The judgement logic is unchanged; what changed is folding the facts we already had
 * into the prose.
 */
export function phonetics(chars: Array<{ char: string; py: string | null }>): Phonetics {
  const tones: ToneInfo[] = chars.map((c) => {
    const t = toneOf(c.py);
    return { char: c.char, py: c.py, tone: t, tone_name: TONE_NAME[t] };
  });
  const ts = tones.filter((t) => t.tone).map((t) => t.tone);

  // Only list characters that have a tone: an unmarked one would display as 轻声,
  // which is missing data, not a real neutral tone.
  const roll = tones.filter((t) => t.tone).map((t) => `${t.char}（${t.tone_name}）`).join(' · ');

  let note: string;
  let level: string;

  if (ts.length < 2) {
    const blank = tones.filter((t) => !t.tone).map((t) => t.char).join('、');
    note = `${blank} 的拼音未标注声调，音律这一维不作判断。`;
    level = '平';
  } else if (new Set(ts).size === 1) {
    const same = TONE_NAME[ts[0]];
    if (ts[0] === 3) {
      note = `${roll} —— 全名同为上声。普通话里上声连读要连续变调（上上上 念成 阳平·阳平·上声），是最拗口的一种组合，念起来费力。`;
      level = '忌';
    } else {
      note = `${roll} —— 全名同为${same}，三个字一个调，读来平直无起伏，略显板正。`;
      level = '参半';
    }
  } else if (new Set(ts).size === ts.length) {
    note = `${roll} —— 声调各不相同，起于${tones[0].tone_name}、收在${tones[tones.length - 1].tone_name}，抑扬有致，读来顺口。`;
    level = '宜';
  } else {
    // Name the characters that clash — "有起伏" is the conclusion, "学盈同为阳平" is why.
    const counts = new Map<number, number>();
    for (const t of ts) counts.set(t, (counts.get(t) ?? 0) + 1);
    const dup = [...new Set(ts)].filter((t) => (counts.get(t) ?? 0) > 1).map((t) => TONE_NAME[t]);
    const sameChars = tones
      .filter((t) => t.tone && (counts.get(t.tone) ?? 0) > 1)
      .map((t) => t.char)
      .join('、');
    note = `${roll} —— ${sameChars} 同为${dup.join('、')}，其余有起伏，读感尚可。`;
    level = '平';
  }

  return { tones, level, note };
}

/**
 * Weights for the four dimensions. A missing dimension (no birth data → no 八字/生肖)
 * is dropped and the rest renormalised.
 *
 * **Domestic ground truth outweighs the Kumasaki system.** These were once
 * shuli .35 / sancai .25 / bazi .25 / zodiac .15 — the stroke-count system at 60%,
 * with what our own engine derives relegated to a supporting role. Three reasons for
 * the change:
 *
 *  ① **The sources are not equivalent.** 五格/三才 is Kumasaki Kenou's 1928 《姓名の神秘》
 *     system, which we are reading off a table. 八字喜用 is ground truth our own engine
 *     derives (day master → strength → structure), and 生肖 follows the mainstream
 *     Taiwanese radical rules. Our own derivation should not defer to a foreign table.
 *
 *  ② **三才 is not an independent dimension.** It is derived entirely from the element
 *     relations of 天/人/地, which come from stroke counts — the same source as 五格数理.
 *     0.35 + 0.25 counted "stroke counts" twice. Hence 三才 drops further than 数理
 *     (25%→17% vs 35%→28%).
 *
 *  ③ 生肖 rises to 0.20: it is a required lens in the Taiwanese market and our
 *     judgement is finer than most (radicals plus reasons, with the branch and habit
 *     layers weighted separately). It stays the lowest of the four all the same —
 *     it is folk practice with wide disagreement between schools, and should not be
 *     able to overturn the others.
 *
 * Net: **55% Chinese-domestic (bazi+zodiac) / 45% Japanese-modern (shuli+sancai)**.
 * Directional but not radical — 五格 remains the largest single non-八字 weight, so a
 * name does not land two grades away from what mainstream tools (五格-dominant, almost
 * without exception) report, which would read as a bug rather than a viewpoint.
 *
 * ⚠️ **The 八字 dimension currently has only 3 levels** (40/70/100 = hit rate 0/0.5/1,
 * with neutral elements excluded from the denominator). It is the coarsest of the four
 * yet carries the highest weight, so scores jump between a few fixed values.
 */
const DIM_WEIGHTS = {
  shuli: 0.28, // 五格数理 (Kumasaki)
  sancai: 0.17, // 三才配置 (Kumasaki, and same source as 五格)
  bazi: 0.35, // 八字喜用 (our engine's ground truth)
  zodiac: 0.2, // 生肖姓名学 (mainstream Taiwanese school)
} as const;

/** 5 tiers. 3 tiers flattened 大吉 into 吉 and 大凶 into 凶, distorting 48 of 80 sampled grades. */
const SHULI_PTS: Record<string, number> = { 大吉: 100, 吉: 85, 半吉: 60, 凶: 30, 大凶: 12 };
const SANCAI_PTS: Record<string, number> = { 大吉: 95, 吉: 85, 半吉: 60, 凶: 35, 大凶: 20 };

export interface NameChar {
  char: string;
  kx: number;
  wx: string | null;
  py: string | null;
  trad: string;
  bs: number;
  rad: string;
  definition: string | null;
  struct: string | null;
  zhuyin: string | null;
  is_surname: boolean;
}

export interface BaziMatch {
  xi_yong: string[];
  ji_shen: string[];
  hit_chars: string[];
  clash_chars: string[];
  unknown_chars: string[];
  given_wuxing: string[];
  verdict: string;
  verdict_text: string;
  score: number;
}

export interface ScoreResult {
  surname: string;
  given: string;
  chars: NameChar[];
  grids: Record<string, GridDetail>;
  raw_grids: Grids;
  sancai: Sancai;
  bazi_match: BaziMatch | null;
  zodiac_match: zodiacLib.ZodiacMatch | null;
  yunshi: Yunshi[];
  phonetics: Phonetics;
  scores: {
    shuli: number;
    sancai: number;
    bazi: number | null;
    zodiac: number | null;
    total: number;
  };
}

export interface ScoreOptions {
  /** 八字喜用五行. When given, the 五行八字 dimension is produced. */
  xiYong?: string[];
  /** 八字忌神五行. */
  jiShen?: string[];
  /** 生肖 or its Earthly Branch. When given, the 生肖 dimension is produced. */
  zodiac?: string;
}

/**
 * Score a name.
 *
 * Throws if the name length is out of range or a character is missing from the table —
 * a silently dropped character would produce a wrong 五格 chart.
 */
export function scoreName(surname: string, given: string, opts: ScoreOptions = {}): ScoreResult {
  const s = [...surname];
  const g = [...given];
  if (s.length < 1 || s.length > 2 || g.length < 1 || g.length > 2) {
    throw new Error('surname 1-2 字、given 1-2 字');
  }

  const resolve = (ch: string): [string, NonNullable<ReturnType<typeof resolveChar>>[1]] => {
    const r = resolveChar(ch);
    if (r === null) throw new Error(`字库查无此字: ${ch}`);
    return r;
  };

  const sPairs = s.map(resolve);
  const gPairs = g.map(resolve);
  const sEntries = sPairs.map(([, e]) => e);
  const gEntries = gPairs.map(([, e]) => e);

  const grids = wuge(sEntries.map((e) => e.kx), gEntries.map((e) => e.kx));
  const sc = sancai(grids.tian, grids.ren, grids.di);
  const gridDetail = gridDetails(grids);

  // 数理得分: 人格 40% / 总格 25% / 地格 20% / 外格 15%.
  // 天格 is fixed by the surname and is not scored (convention).
  const shuliScore = pyRound(
    SHULI_PTS[gridDetail.ren.level] * 0.40 +
      SHULI_PTS[gridDetail.zong.level] * 0.25 +
      SHULI_PTS[gridDetail.di.level] * 0.20 +
      SHULI_PTS[gridDetail.wai.level] * 0.15,
  );
  const sancaiScore = SANCAI_PTS[sc.level];

  // 五行八字 dimension: do the given name's elements fall on the favourable side?
  // The surname does not take part — it cannot be changed.
  let baziMatch: BaziMatch | null = null;
  const xiYong = opts.xiYong ?? [];
  const jiShen = opts.jiShen ?? [];

  if (xiYong.length) {
    const hits: string[] = [];
    const miss: string[] = [];
    const unknown: string[] = [];
    for (let i = 0; i < g.length; i++) {
      const w = gEntries[i].wx;
      if (w === null) unknown.push(g[i]);
      else if (xiYong.includes(w)) hits.push(g[i]);
      else if (jiShen.includes(w)) miss.push(g[i]);
    }
    const known = hits.length + miss.length;
    const pct = known ? hits.length / known : 0.5;
    const scoreV = known ? pyRound(40 + pct * 60) : 60;

    const givenWx = gEntries.map((e) => e.wx).filter((w): w is string => w !== null);
    // ⚠️ Every verdict opens with the facts — "学（水）· 盈（水）". This used to be
    // conclusion-only, with neither the characters, their elements, nor the favourable
    // set written into the sentence: a verdict the reader had no way to check.
    const roll = g
      .map((ch, i) => (gEntries[i].wx ? `${ch}（${gEntries[i].wx}）` : null))
      .filter(Boolean)
      .join(' · ');
    const xyS = xiYong.join('、');
    const jsS = jiShen.join('、');

    let verdict: string;
    let vtext: string;
    if (!known) {
      verdict = '未定';
      vtext = `${unknown.join('、')} 的五行各派标注不一，这一维无法判定。`;
    } else if (miss.length && !hits.length) {
      verdict = '凶';
      vtext = `${roll} —— 全部落在忌神${jsS}上。命局本就不需要这一行，再补进去是雪上加霜，这是姓名学里最该避开的一种。你的喜用是${xyS}，改名优先往这个方向靠。`;
    } else if (hits.length && !miss.length) {
      verdict = '吉';
      vtext = `${roll} —— 正落在喜用${xyS}上。命局缺的那一口气，名字替它补上了，这是八字姓名学里最理想的情形。`;
    } else {
      verdict = '半吉';
      vtext = `${roll} —— ${hits.join('、')} 落在喜用${xyS}，${miss.join('、')} 落在忌神${jsS}，功过相抵。要改就改 ${miss[0]}，收益最大。`;
    }

    baziMatch = {
      xi_yong: xiYong,
      ji_shen: jiShen,
      hit_chars: hits,
      clash_chars: miss,
      unknown_chars: unknown,
      given_wuxing: givenWx,
      verdict,
      verdict_text: vtext,
      score: scoreV,
    };
  }

  const zodiacMatch = opts.zodiac
    ? zodiacLib.evaluate(
        opts.zodiac,
        g.map((c, i) => [c, gPairs[i][0]] as [string, string]),
        s.map((c, i) => [c, sPairs[i][0]] as [string, string]),
      )
    : null;

  // Per-character detail including the definition: without it a reader sees
  // "梓 11画 木" and still has no idea what the character means.
  const allPairs = [...sPairs, ...gPairs];
  const allChars = [...s, ...g];
  const charsOut: NameChar[] = allPairs.map(([key, e], i) => {
    const isSurname = i < s.length;
    // Surname position consults the surname-reading table: 任/区/朴/单 read differently
    // as surnames, and the table can only hold one primary reading. **This one override
    // covers three things at once** — the per-character reading, the Bopomofo (which is
    // derived from it), and the tone used by 音律.
    const py = isSurname ? SURNAME_PY[key] ?? e.py : e.py;
    return {
      char: allChars[i],
      kx: e.kx,
      wx: e.wx,
      py,
      trad: e.t ?? key,
      bs: e.bs,
      rad: e.rad,
      definition: definitionOf(key),
      struct: structOf(key),
      // Bopomofo is standard in the Taiwanese market. Unconvertible readings return
      // null and the row is simply not rendered — better nothing than something wrong.
      zhuyin: toBopomofo(py),
      is_surname: isSurname,
    };
  });

  const parts: Array<[string, number, number]> = [
    ['shuli', shuliScore, DIM_WEIGHTS.shuli],
    ['sancai', sancaiScore, DIM_WEIGHTS.sancai],
  ];
  if (baziMatch) parts.push(['bazi', baziMatch.score, DIM_WEIGHTS.bazi]);
  if (zodiacMatch) parts.push(['zodiac', zodiacMatch.score, DIM_WEIGHTS.zodiac]);
  const totalW = parts.reduce((a, [, , w]) => a + w, 0);
  const total = pyRound(parts.reduce((a, [, v, w]) => a + v * w, 0) / totalW);

  return {
    surname,
    given,
    chars: charsOut,
    grids: gridDetail,
    raw_grids: grids,
    sancai: sc,
    bazi_match: baziMatch,
    zodiac_match: zodiacMatch,
    // The other half of 五格: giving "人格 37 吉" without these three tells half the story.
    yunshi: yunshi(grids),
    phonetics: phonetics(charsOut.map((c) => ({ char: c.char, py: c.py }))),
    scores: {
      shuli: shuliScore,
      sancai: sancaiScore,
      bazi: baziMatch?.score ?? null,
      zodiac: zodiacMatch?.score ?? null,
      total,
    },
  };
}
