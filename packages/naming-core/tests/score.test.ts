/**
 * Unit tests for the naming engine.
 *
 * These cover the cases that were argued over or that broke the original engine —
 * the five-grid formula across all four name shapes, banker's rounding, the
 * surname-reading overrides, the two-layer zodiac weighting, and 三才 being a lookup
 * rather than a derivation. A port that passes these reproduces behaviour that was
 * paid for in bug reports.
 */

import assert from 'node:assert/strict';
import {
  evaluateZodiac,
  judgeChar,
  normalizeZodiac,
  sancai,
  scoreName,
  shuliLevel,
  shuliWuxing,
  wuge,
} from '../src/index.js';
import { pyRound } from '../src/lib/round.js';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

console.log('五格公式 — all four name shapes');
check('单姓单名: 天=姓+1, 地=名+1, 外=2', () => {
  // 王(4) 伟(11)
  const g = wuge([4], [11]);
  assert.deepEqual(g, { tian: 5, ren: 15, di: 12, wai: 2, zong: 15 });
});
check('单姓双名: 外 = 名末字 + 1', () => {
  // 李(7) 梓(11) 涵(12)
  const g = wuge([7], [11, 12]);
  assert.deepEqual(g, { tian: 8, ren: 18, di: 23, wai: 13, zong: 30 });
});
check('复姓单名: 天 = 姓两字之和, 外 = 姓首字 + 1', () => {
  // 欧(15) 阳(17) 娜(10)
  const g = wuge([15, 17], [10]);
  assert.deepEqual(g, { tian: 32, ren: 27, di: 11, wai: 16, zong: 42 });
});
check('复姓双名: 外 = 姓首字 + 名末字', () => {
  // 司(5) 马(10) 相(9) 如(6)
  const g = wuge([5, 10], [9, 6]);
  assert.deepEqual(g, { tian: 15, ren: 19, di: 15, wai: 11, zong: 30 });
});

console.log('数理');
check('数理五行按尾数: 1,2木 3,4火 5,6土 7,8金 9,0水', () => {
  assert.equal(shuliWuxing(11), '木');
  assert.equal(shuliWuxing(23), '火');
  assert.equal(shuliWuxing(15), '土');
  assert.equal(shuliWuxing(27), '金');
  assert.equal(shuliWuxing(30), '水');
});
check('81 以上按行规减 80 复归', () => {
  assert.equal(shuliLevel(85), shuliLevel(5));
});
check('五档吉凶齐全 — 大吉/吉/半吉/凶/大凶 都有实际条目', () => {
  const levels = new Set(Array.from({ length: 81 }, (_, i) => shuliLevel(i + 1)));
  const expected = ['大吉', '吉', '半吉', '凶', '大凶'];
  for (const l of levels) assert.ok(expected.includes(l), `unexpected level: ${l}`);
  // All five must actually occur: collapsing to three distorted 48 of 80 sampled grades.
  for (const e of expected) assert.ok(levels.has(e), `level never occurs: ${e}`);
});

console.log('Python 兼容舍入 (banker\'s rounding)');
check('.5 rounds to even, not away from zero', () => {
  assert.equal(pyRound(82.5), 82); // Math.round would give 83
  assert.equal(pyRound(83.5), 84);
  assert.equal(pyRound(0.5), 0);
  assert.equal(pyRound(1.5), 2);
});
check('non-.5 values round normally', () => {
  assert.equal(pyRound(82.4), 82);
  assert.equal(pyRound(82.6), 83);
});
check('a two-character 生肖 score of 82.5 lands on 82', () => {
  // (100 + 65) / 2 = 82.5 — the exact case that put 63 of 200 names one point off.
  assert.equal(pyRound((100 + 65) / 2), 82);
});

console.log('三才 — lookup, not derivation');
check('木金水 grades 大凶, though the generation rules suggest 半吉', () => {
  // 天 11(木) 人 27(金) 地 29(水): one restraint plus one generation by the rules,
  // yet the tradition grades it 大凶. This is why the table is a table.
  const sc = sancai(11, 27, 29);
  assert.equal(sc.combo, '木金水');
  assert.equal(sc.level, '大凶');
});
check('relations are still derived, for display', () => {
  const sc = sancai(11, 27, 29); // 木 → 金 is 被克; 金 → 水 is 生
  assert.equal(sc.tian_ren, '被克');
  assert.equal(sc.ren_di, '生');
});
check('all 125 configurations resolve', () => {
  const nums = [11, 13, 15, 17, 19]; // 木火土金水
  for (const t of nums) for (const r of nums) for (const d of nums) {
    assert.ok(sancai(t, r, d).level, `missing ${t}/${r}/${d}`);
  }
});

console.log('生肖 — two-layer weighting');
check('branch layer outweighs habit layer: 减 for the dragon is 忌, not 参半', () => {
  // 减 carries 氵 (dragon favours water, habit layer) and 戌 (辰戌六冲, branch layer).
  // Counting bare hits made this 参半 — a head-on clash cancelled by "龙得水而腾".
  const d = judgeChar('龙', '减');
  assert.equal(d.verdict, '忌');
});
check('two branch-layer hits in opposition stay 参半, not forced to 忌', () => {
  // 翔 for the rabbit: 羊 (亥卯未三合) vs 羽 (卯酉冲) — both branch layer. A genuine
  // stand-off; flattening it would be inventing certainty.
  const d = judgeChar('兔', '翔');
  assert.equal(d.verdict, '参半');
});
check('own branch radical is neutral, never scored', () => {
  // 龍 for the dragon is 本命 — no verdict either way.
  const d = judgeChar('龙', '龙');
  assert.equal(d.verdict, '平');
  assert.ok(d.own.length > 0, 'expected the 本命 radical to be reported');
  assert.equal(d.xi.length, 0);
  assert.equal(d.ji.length, 0);
});
check('冖 is not treated as 宀: 学 is not "favourable" for the rat', () => {
  // 冖 is a roof without walls and shelters nothing. Conflating the two affected
  // 9 zodiacs across 652 characters.
  const d = judgeChar('鼠', '学');
  assert.notEqual(d.verdict, '宜');
});
check('every judgement carries its radical and reason', () => {
  const d = judgeChar('龙', '减');
  for (const hit of [...d.xi, ...d.ji, ...d.mixed]) {
    assert.ok(hit.root, 'missing root');
    assert.ok(hit.why, 'missing reason');
  }
});
check('zodiac input accepts 生肖 / 地支 / 繁体', () => {
  assert.equal(normalizeZodiac('龙'), '龙');
  assert.equal(normalizeZodiac('辰'), '龙');
  assert.equal(normalizeZodiac('龍'), '龙');
  assert.equal(normalizeZodiac('nope'), null);
});
check('only the given name is scored — the surname cannot be changed', () => {
  const withGood = evaluateZodiac('龙', [['海', '海']], [['减', '减']]);
  const withBad = evaluateZodiac('龙', [['海', '海']], [['海', '海']]);
  assert.equal(withGood!.score, withBad!.score);
  assert.equal(withGood!.surname.length, 1); // still reported, just not scored
});

console.log('姓氏专读');
check('任 reads rén as a surname, not rèn', () => {
  const r = scoreName('任', '伟');
  assert.equal(r.chars[0].py, 'rén');
});
check('the override also drives 注音 and the tone analysis', () => {
  const r = scoreName('任', '伟');
  assert.equal(r.chars[0].zhuyin, 'ㄖㄣˊ');
  assert.equal(r.phonetics.tones[0].tone, 2); // 阳平, from rén
});
check('区 reads ōu, 朴 reads piáo, 单 reads shàn as surnames', () => {
  assert.equal(scoreName('区', '伟').chars[0].py, 'ōu');
  assert.equal(scoreName('朴', '伟').chars[0].py, 'piáo');
  assert.equal(scoreName('单', '伟').chars[0].py, 'shàn');
});
check('the override applies only in surname position', () => {
  // 任 as the given name keeps its table reading.
  const r = scoreName('王', '任');
  assert.notEqual(r.chars[1].py, 'rén');
});

console.log('维度归一');
check('no birth data → two dimensions, renormalised', () => {
  const r = scoreName('王', '伟');
  assert.equal(r.scores.bazi, null);
  assert.equal(r.scores.zodiac, null);
  // total is the 数理/三才 weighted mean over 0.28 + 0.17
  const expect = pyRound((r.scores.shuli * 0.28 + r.scores.sancai * 0.17) / 0.45);
  assert.equal(r.scores.total, expect);
});
check('adding 八字 changes the total', () => {
  const without = scoreName('王', '伟');
  const with_ = scoreName('王', '伟', { xiYong: ['土'], jiShen: ['木'] });
  assert.notEqual(without.scores.total, with_.scores.total);
  assert.ok(with_.scores.bazi !== null);
});
check('unknown-element characters are reported, not silently scored', () => {
  const r = scoreName('王', '伟', { xiYong: ['金'] });
  assert.ok(r.bazi_match !== null);
  assert.ok(Array.isArray(r.bazi_match!.unknown_chars));
});

console.log('输出完整性');
check('every grid carries its role, reading and keywords', () => {
  const r = scoreName('李', '梓涵');
  for (const k of ['tian', 'ren', 'di', 'wai', 'zong']) {
    const g = r.grids[k];
    assert.ok(g.role, `${k} missing role`);
    assert.ok(g.poem, `${k} missing poem`);
    assert.ok(g.text.length > 20, `${k} reading too short`);
  }
  assert.ok(r.grids.tian.role.includes('不论吉凶'), '天格 should be marked as not judged');
});
check('the three fortunes are all present', () => {
  const r = scoreName('李', '梓涵');
  assert.deepEqual(r.yunshi.map((y) => y.name), ['基础运', '成功运', '社交运']);
  for (const y of r.yunshi) assert.ok(y.level && y.text && y.basis);
});
check('per-character detail includes definitions', () => {
  const r = scoreName('李', '梓涵');
  for (const c of r.chars) {
    assert.ok(c.kx > 0);
    assert.ok(c.definition, `${c.char} missing definition`);
  }
});
check('音律 note states the tones, not just a conclusion', () => {
  const r = scoreName('顾', '学盈');
  assert.ok(r.phonetics.note.includes('（'), 'note should name the tones inline');
});

console.log('错误处理');
check('an off-table character throws rather than dropping silently', () => {
  assert.throws(() => scoreName('王', '\u{2A6B2}'), /字库查无此字/);
});
check('an out-of-range name length throws', () => {
  assert.throws(() => scoreName('欧阳修', '伟'), /1-2 字/);
  assert.throws(() => scoreName('王', '一二三'), /1-2 字/);
});

console.log(`\n${passed} checks passed.`);
