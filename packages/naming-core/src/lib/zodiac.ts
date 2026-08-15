/**
 * 生肖姓名学 — component-radical suitability, by lookup plus branch-relation derivation.
 *
 * In the Taiwanese naming market "属 X 宜/忌 某字根" sits alongside 五格 as a
 * mainstream view, so it is a required dimension rather than a bonus one.
 *
 * Two layers, deliberately kept apart:
 *
 *   1. **Branch layer (derived, not written by hand)** — 三合 / 三会 / 六合 = favourable;
 *      六冲 / 六害 / 相刑 = unfavourable. Pure Earthly-Branch arithmetic with no
 *      school-to-school disagreement, so it is computed rather than typed out.
 *   2. **Habit layer (knowledge table)** — the radical categories each zodiac animal
 *      favours or avoids (grain / burrow / meat / coloured silk …). Mainstream
 *      Taiwanese consensus only; **anything contested is left out**. Deliberately
 *      excluded as too contested: 牛忌车, 龙忌门, 鸡宜小, 蛇忌水, 鼠忌山, 猪忌辶.
 *
 * **A character's own branch radical is always neutral** — scored neither up nor down,
 * just labelled 本命. The schools contradict each other outright here: 鸡 is said to
 * favour 彩羽 while 酉见酉 is called 自刑; 龙 favours 抬头 while 辰见辰 is 自刑.
 * Neutral is the only reading that does not contradict itself. Consequently the
 * branch layer's 自刑 (辰午酉亥) produces no judgement at all.
 *
 * Radicals come from a component table built by recursively decomposing the
 * traditional glyph (IDS) and keeping only whitelisted hits. Traditional forms are
 * used because 姓名学 reasons in traditional glyphs — the same convention as 康熙笔画.
 */

import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { pyRound } from './round.js';

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data');

let _roots: Record<string, string> | null = null;

function roots(): Record<string, string> {
  if (!_roots) {
    _roots = JSON.parse(
      gunzipSync(readFileSync(join(DATA_DIR, 'char-roots.json.gz'))).toString('utf8'),
    ) as Record<string, string>;
  }
  return _roots;
}

export const ZHI = '子丑寅卯辰巳午未申酉戌亥';
export const ZODIAC = '鼠牛虎兔龙蛇马羊猴鸡狗猪';

const ZHI_TO_ZODIAC: Record<string, string> = {};
const ZODIAC_TO_ZHI: Record<string, string> = {};
for (let i = 0; i < ZHI.length; i++) {
  ZHI_TO_ZODIAC[ZHI[i]] = ZODIAC[i];
  ZODIAC_TO_ZHI[ZODIAC[i]] = ZHI[i];
}

/**
 * Radicals that stand for each branch. Only forms whose glyph genuinely carries the
 * branch/animal image are included. The "resembles" group (辶廴弓几川 for the snake,
 * 火灬南 for 午 fire) is mainstream doctrine — kept, and explained in the reason text.
 */
const ZHI_ROOTS: Record<string, string[]> = {
  子: ['子', '鼠'],
  丑: ['丑', '牛', '牜'],
  寅: ['寅', '虎', '虍'],
  卯: ['卯', '兔'],
  辰: ['辰', '龍', '龙'],
  巳: ['巳', '虫', '辶', '廴', '弓', '几', '川'],
  午: ['午', '馬', '马', '火', '灬', '南'],
  未: ['未', '羊', '善', '美'],
  申: ['申', '猴', '袁', '爰', '侯'],
  酉: ['酉', '鳥', '鸟', '隹', '羽', '飛', '飞', '非'],
  戌: ['戌', '狗', '犬', '犭'],
  亥: ['亥', '豕', '豖', '家', '豬', '猪'],
};

const SANHE = [['申', '子', '辰'], ['亥', '卯', '未'], ['寅', '午', '戌'], ['巳', '酉', '丑']];
const SANHUI = [['亥', '子', '丑'], ['寅', '卯', '辰'], ['巳', '午', '未'], ['申', '酉', '戌']];
const LIUHE = [['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未']];
const LIUCHONG = [['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥']];
const LIUHAI = [['子', '未'], ['丑', '午'], ['寅', '巳'], ['卯', '辰'], ['申', '亥'], ['酉', '戌']];
/**
 * 相刑: 子卯无礼之刑, 寅巳申恃势之刑, 丑戌未无恩之刑.
 * 自刑 (辰午酉亥) lands on the character's own branch radical and is neutral by the
 * rule above, so it is not in this table.
 */
const XING = [
  ['子', '卯'], ['寅', '巳'], ['巳', '申'], ['寅', '申'],
  ['丑', '戌'], ['戌', '未'], ['丑', '未'],
];

const GOOD_REL = new Set(['三合', '三会', '六合']);
const BAD_REL = new Set(['六冲', '六害', '相刑']);

const REL_WHY: Record<string, string> = {
  三合: '三合局，同气相求，得人助',
  三会: '三会方局，同方相扶，根基稳',
  六合: '六合之谊，逢人相帮，人缘佳',
  六冲: '地支相冲，正面相克，多波折',
  六害: '地支相害，暗里损耗，易受牵累',
  相刑: '地支相刑，彼此刑伤，易起是非',
};

/** Relations between one branch and all others. */
function pairsOf(zhi: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const add = (other: string, kind: string) => {
    if (other === zhi) return; // own radical = 本命, neutral by rule
    (out[other] ??= []).push(kind);
  };

  for (const grp of SANHE) if (grp.includes(zhi)) for (const o of grp) add(o, '三合');
  for (const grp of SANHUI) if (grp.includes(zhi)) for (const o of grp) add(o, '三会');
  for (const [a, b] of LIUHE) {
    if (zhi === a) add(b, '六合');
    else if (zhi === b) add(a, '六合');
  }
  for (const [a, b] of LIUCHONG) {
    if (zhi === a) add(b, '六冲');
    else if (zhi === b) add(a, '六冲');
  }
  for (const [a, b] of LIUHAI) {
    if (zhi === a) add(b, '六害');
    else if (zhi === b) add(a, '六害');
  }
  for (const [a, b] of XING) {
    if (zhi === a) add(b, '相刑');
    else if (zhi === b) add(a, '相刑');
  }
  return out;
}

/**
 * Radical categories.
 *
 * ⚠️ 「冖」 is deliberately NOT grouped with 「宀」. They were once the same category,
 * which made 「學」 read as favourable for the rat — 宀 is a roof *with walls* (a burrow,
 * a byre, a home) while 冖 is a roof only and cannot shelter anything. Mainstream
 * Taiwanese sources list 宀 alone. That single conflation affected the 9 zodiacs with
 * a 宀 preference across 652 characters containing 冖 — the largest systematic
 * over-broad judgement found in this table.
 *
 * 「士」 is likewise excluded from the 小 group: IDS decomposition also yields 士 from
 * 壬 and 寺 (mis-flagging 任 and 诗), and 士 vs 土 cannot be told apart at component
 * level. Missing a judgement beats making a wrong one.
 */
const CATS: Record<string, string[]> = {
  五谷: ['米', '豆', '禾', '麥', '麦', '粱', '梁', '粟', '叔', '稷', '黍', '麻'],
  草: ['艹', '艸'],
  木: ['木'],
  宀: ['宀'],
  口: ['口'],
  门: ['門', '门'],
  肉: ['月', '心', '忄', '肉'],
  彩衣: ['彡', '巾', '衣', '衤', '糸', '纟', '采'],
  王: ['王', '玉', '大', '君', '令', '帝'],
  小: ['小', '少', '臣'],
  人: ['人', '亻', '彳'],
  山: ['山', '艮', '丘'],
  水: ['水', '氵', '冫', '雨', '雲', '云'],
  日: ['日'],
  夕: ['夕'],
  刀: ['刀', '刂', '血'],
  示: ['示', '礻'],
  田: ['田'],
  车: ['車', '车'],
  虫: ['虫', '豸'],
};

/** 生肖 → [category, 宜/忌, reason]. Mainstream-consensus entries only. */
const HABITS: Record<string, Array<[string, string, string]>> = {
  鼠: [
    ['五谷', '宜', '鼠喜五谷，一生得食无虞'],
    ['宀', '宜', '有洞可栖，安身立命'],
    ['口', '宜', '洞穴之象，藏身得所'],
    ['草', '宜', '草丛可藏身，进退有路'],
    ['田', '宜', '田间为鼠的活动觅食之地'],
    ['夕', '宜', '鼠属夜行，入夜得时'],
    ['王', '宜', '子居十二支之首，可当家掌权'],
    ['彩衣', '宜', '披彩增贵气'],
    ['日', '忌', '昼伏夜出，见日不宁'],
    ['人', '忌', '鼠见人则遭驱赶'],
  ],
  牛: [
    ['草', '宜', '牛食青草，饱足安逸'],
    ['五谷', '宜', '得五谷之食'],
    ['宀', '宜', '有栏舍可归'],
    ['田', '宜', '牛耕于田，各得其位'],
    ['肉', '忌', '牛为素食，见肉不合本性'],
    ['王', '忌', '牛为耕作之身，强居高位反增劳苦'],
    ['示', '忌', '示主祭祀，牛作牺牲'],
    ['彩衣', '忌', '披红挂彩多为祭牲之相'],
    ['刀', '忌', '见刀有血光之忧'],
  ],
  虎: [
    ['山', '宜', '虎归山林，得其地利'],
    ['王', '宜', '虎为兽中之王，宜掌威权'],
    ['肉', '宜', '虎为肉食，得食丰足'],
    ['彩衣', '宜', '虎纹斑斓，增其威仪'],
    ['木', '宜', '山林之象，藏身有处'],
    ['人', '忌', '虎见人则伤人，亦招人捕'],
    ['口', '忌', '虎入笼口，受困难伸'],
    ['门', '忌', '困于牢笼，志难得展'],
    ['小', '忌', '降格为猫，威势尽失'],
    ['田', '忌', '虎落平阳，无所施其力'],
  ],
  兔: [
    ['草', '宜', '兔食青草，衣食不缺'],
    ['五谷', '宜', '得食无缺'],
    ['宀', '宜', '狡兔有窟，安居得所'],
    ['口', '宜', '洞穴之象'],
    ['木', '宜', '林间藏身'],
    ['彩衣', '宜', '增其秀气'],
    ['肉', '忌', '兔为素食，见肉不合本性'],
    ['王', '忌', '兔性柔，强出头反受其累'],
    ['刀', '忌', '有血光之忧'],
  ],
  龙: [
    ['水', '宜', '龙得水而腾，如鱼得水'],
    ['王', '宜', '龙为至尊，宜掌权柄'],
    ['日', '宜', '飞龙在天，与日月同辉'],
    ['草', '忌', '龙落草丛，屈居下位'],
    ['田', '忌', '龙陷田间，难展身手'],
    ['小', '忌', '格局变小，威势尽失'],
    ['虫', '忌', '龙降为虫，格局尽失'],
  ],
  蛇: [
    ['口', '宜', '蛇有洞穴可藏'],
    ['宀', '宜', '得所安身'],
    ['木', '宜', '蛇可上树，登高得势'],
    ['肉', '宜', '蛇为肉食，得食丰足'],
    ['彩衣', '宜', '增其文采'],
    ['人', '忌', '蛇见人则遭打'],
  ],
  马: [
    ['草', '宜', '马食青草，饱足'],
    ['五谷', '宜', '得食丰足'],
    ['木', '宜', '野外得所'],
    ['宀', '宜', '有厩可歇'],
    ['彩衣', '宜', '配鞍辔而增贵'],
    ['田', '忌', '下田耕作非马所长，徒增劳苦'],
    ['车', '忌', '拉车负重，劳碌一生'],
    ['肉', '忌', '马为素食，见肉不合本性'],
  ],
  羊: [
    ['草', '宜', '羊食青草，饱足安逸'],
    ['五谷', '宜', '得食无虞'],
    ['木', '宜', '林野得所'],
    ['宀', '宜', '有栏可归'],
    ['肉', '忌', '羊为素食，见肉不合本性'],
    ['示', '忌', '示主祭祀，羊作牺牲'],
    ['刀', '忌', '有血光之忧'],
    ['王', '忌', '羊性温顺，强居高位反受其累'],
  ],
  猴: [
    ['木', '宜', '猴居树上，得其自在'],
    ['宀', '宜', '有洞可栖'],
    ['人', '宜', '猴喜近人，善得人缘'],
    ['山', '宜', '山林为家'],
    ['五谷', '忌', '猴不食五谷，见之反遭糟蹋'],
    ['刀', '忌', '有血光之忧'],
  ],
  鸡: [
    ['五谷', '宜', '鸡食五谷，一生不愁'],
    ['彩衣', '宜', '鸡有彩羽，增其华美'],
    ['山', '宜', '鸡上山头，得展英姿'],
    ['肉', '忌', '鸡不食肉，见之无用'],
    ['刀', '忌', '有血光之忧'],
  ],
  狗: [
    ['人', '宜', '狗忠于人，得主得食'],
    ['宀', '宜', '有家可归'],
    ['肉', '宜', '狗为肉食，得食丰足'],
    ['五谷', '忌', '狗不食五谷'],
    ['口', '忌', '口多则犬吠不宁，是非缠身'],
    ['刀', '忌', '有血光之忧'],
  ],
  猪: [
    ['五谷', '宜', '猪食五谷，丰衣足食'],
    ['宀', '宜', '有圈可栖'],
    ['口', '宜', '得食之象'],
    ['示', '忌', '示主祭祀，猪作牺牲'],
    ['刀', '忌', '有屠宰之忧'],
    ['彩衣', '忌', '披彩多为祭品之相'],
    ['王', '忌', '猪不宜称王，反招宰割'],
  ],
};

interface RootRule {
  cat: string;
  why: string;
  /**
   * Came from the **branch layer** (三合/三会/六合 vs 冲/害/刑) rather than the habit
   * layer. Weighted double — "见日不宁" is a discomfort, "地支相冲" is a head-on clash.
   * Both the favourable and unfavourable sides carry the flag: marking only the
   * unfavourable side would flatten a genuine 三合-vs-六冲 stand-off into 忌.
   */
  hard?: boolean;
}

interface ZodiacRules {
  xi: Record<string, RootRule>;
  ji: Record<string, RootRule>;
  mixed: Record<string, RootRule>;
  own: Record<string, RootRule>;
}

/**
 * Expand both layers into 生肖 → {radical: judgement} lookup tables (computed once).
 *
 * A radical can be hit by both layers at once (for the rabbit, 未/羊 is 三合 while
 * belonging to no habit category). Branch layer merges first, habit layer second,
 * reasons concatenated; where the two disagree the radical becomes `mixed`.
 */
function buildRules(): Record<string, ZodiacRules> {
  const rules: Record<string, ZodiacRules> = {};

  for (const [zodiac, zhi] of Object.entries(ZODIAC_TO_ZHI)) {
    const xi: Record<string, RootRule> = {};
    const ji: Record<string, RootRule> = {};
    const mixed: Record<string, RootRule> = {};
    const own: Record<string, RootRule> = {};

    for (const root of ZHI_ROOTS[zhi]) {
      own[root] = { cat: '本命', why: `${zodiac}之本命字根，各派说法互斥，不判吉凶` };
    }

    for (const [other, kinds] of Object.entries(pairsOf(zhi))) {
      const good = kinds.filter((k) => GOOD_REL.has(k));
      const bad = kinds.filter((k) => BAD_REL.has(k));
      const whyGood = good.map((k) => REL_WHY[k]).join('；');
      const whyBad = bad.map((k) => REL_WHY[k]).join('；');

      for (const root of ZHI_ROOTS[other]) {
        if (root in own) continue; // 本命 radical is never rewritten by a branch relation
        const cat = `${ZHI_TO_ZODIAC[other]}（${other}）`;
        if (good.length && bad.length) {
          // 巳申 is both 六合 and 相刑 — "合中带刑" in the tradition; no forced verdict.
          mixed[root] = { cat, why: `${whyGood}，但${whyBad}，合中带刑` };
        } else if (good.length) {
          xi[root] = { cat, why: whyGood, hard: true };
        } else if (bad.length) {
          ji[root] = { cat, why: whyBad, hard: true };
        }
      }
    }

    for (const [cat, side, why] of HABITS[zodiac]) {
      for (const root of CATS[cat]) {
        if (root in own) continue;
        const entry: RootRule = { cat, why };
        const [target, opposite] = side === '宜' ? [xi, ji] : [ji, xi];
        if (root in opposite) {
          const prev = opposite[root];
          delete opposite[root];
          mixed[root] = { cat, why: `${prev.why}；另一面：${why}` };
        } else if (!(root in mixed)) {
          target[root] = entry;
        }
      }
    }

    rules[zodiac] = { xi, ji, mixed, own };
  }
  return rules;
}

const RULES = buildRules();

/** Component radicals a character hits (traditional decomposition, whitelisted). */
export function rootsOf(ch: string): string[] {
  return [...(roots()[ch] ?? '')];
}

export function zodiacFromZhi(zhi: string): string | null {
  return ZHI_TO_ZODIAC[zhi] ?? null;
}

/** Accepts a zodiac character (鼠/龍/马…) or a branch character (子/辰…). */
export function normalizeZodiac(z: string | null | undefined): string | null {
  if (!z) return null;
  let s = z.trim();
  const trad: Record<string, string> = { 龍: '龙', 馬: '马', 雞: '鸡', 豬: '猪', 鷄: '鸡' };
  s = trad[s] ?? s;
  if (s in ZODIAC_TO_ZHI) return s;
  return ZHI_TO_ZODIAC[s] ?? null;
}

export interface RootHit {
  root: string;
  cat: string;
  why: string;
  hard?: boolean;
}

export interface CharJudgement {
  char: string;
  /** 宜 / 忌 / 参半 / 平 (no hits, or only the character's own branch radical) */
  verdict: string;
  xi: RootHit[];
  ji: RootHit[];
  mixed: RootHit[];
  own: RootHit[];
}

/**
 * Suitability of one character for one zodiac sign.
 *
 * `charKey` is the character-table head entry (after traditional→simplified folding);
 * defaults to `ch` itself.
 *
 * **Layer weighting**: branch layer counts 2, habit layer 1. Counting bare hits made
 * 「减」 read as 参半 for the dragon — a head-on 辰戌六冲 cancelled out by "龙得水而腾"
 * because the character happens to contain 氵. 3677 characters sat on that pattern.
 *
 * ⚠️ But an unfavourable branch hit must not veto either: 「翔」 for the rabbit is
 * 羊 (三合) + 羽 (卯酉冲) — **both from the branch layer**, which is a genuine
 * stand-off. Flattening that to 忌 would be inventing certainty. Hence weighting,
 * not veto.
 */
export function judgeChar(zodiac: string, ch: string, charKey?: string): CharJudgement {
  const rule = RULES[zodiac];
  const hits = rootsOf(charKey ?? ch);
  const pick = (table: Record<string, RootRule>): RootHit[] =>
    hits.filter((r) => r in table).map((r) => ({ root: r, ...table[r] }));

  const xi = pick(rule.xi);
  const ji = pick(rule.ji);
  const mixed = pick(rule.mixed);
  const own = pick(rule.own);

  const sx = xi.reduce((a, d) => a + (d.hard ? 2 : 1), 0);
  const sj = ji.reduce((a, d) => a + (d.hard ? 2 : 1), 0);

  let verdict: string;
  if (sx > sj) verdict = '宜';
  else if (sj > sx) verdict = '忌';
  else if (sx) verdict = '参半'; // tied and both non-empty
  else verdict = '平';

  return { char: ch, verdict, xi, ji, mixed, own };
}

export interface ZodiacReason {
  root: string;
  cat: string;
  why: string;
  kind: 'xi' | 'ji' | 'mixed';
}

/**
 * One character judged against all twelve signs (dictionary-page view, 鼠→猪 order).
 *
 * Reasons flatten xi/ji/mixed; `own` (the character's own branch radical) carries no
 * verdict and so contributes no reason. `kind` tells a renderer which way each reason
 * cuts — the overall verdict alone is not enough to colour them.
 */
export function judgeAll(ch: string, charKey?: string): Array<{
  zodiac: string;
  verdict: string;
  reasons: ZodiacReason[];
}> {
  return [...ZODIAC].map((z) => {
    const d = judgeChar(z, ch, charKey);
    const reasons: ZodiacReason[] = [];
    for (const kind of ['xi', 'ji', 'mixed'] as const) {
      for (const r of d[kind]) reasons.push({ root: r.root, cat: r.cat, why: r.why, kind });
    }
    return { zodiac: z, verdict: d.verdict, reasons };
  });
}

const VERDICT_PTS: Record<string, number> = { 宜: 100, 平: 65, 参半: 55, 忌: 30 };

export interface ZodiacMatch {
  zodiac: string;
  zhi: string;
  given: CharJudgement[];
  surname: CharJudgement[];
  score: number;
  hit_chars: string[];
  clash_chars: string[];
}

/**
 * The 生肖 dimension.
 *
 * Only the given name is scored — a surname cannot be changed, so judging it carries no
 * decision value (same convention as the 八字 dimension). It is still judged and
 * returned so the caller can see the whole name's radical picture.
 */
export function evaluate(
  zodiac: string | null | undefined,
  givenChars: Array<[string, string]>,
  surnameChars: Array<[string, string]> = [],
): ZodiacMatch | null {
  const z = normalizeZodiac(zodiac);
  if (!z || !(z in RULES)) return null;

  const given = givenChars.map(([c, k]) => judgeChar(z, c, k));
  const surname = surnameChars.map(([c, k]) => judgeChar(z, c, k));
  const score = given.length
    ? pyRound(given.reduce((a, d) => a + VERDICT_PTS[d.verdict], 0) / given.length)
    : 65;

  return {
    zodiac: z,
    zhi: ZODIAC_TO_ZHI[z],
    given,
    surname,
    score,
    hit_chars: given.filter((d) => d.verdict === '宜').map((d) => d.char),
    clash_chars: given.filter((d) => d.verdict === '忌').map((d) => d.char),
  };
}
