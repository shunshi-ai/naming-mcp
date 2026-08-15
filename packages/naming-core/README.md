# shunshi-naming-core

> 🇨🇳 Chinese name scoring engine — 五格剖象 · 三才配置 · 81 数理 · 生肖姓名学 · 八字喜用 · 音律. Computed on real 康熙笔画, offline and deterministic.

[![npm](https://img.shields.io/npm/v/shunshi-naming-core)](https://www.npmjs.com/package/shunshi-naming-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Powered by Shunshi.AI](https://img.shields.io/badge/powered%20by-Shunshi.AI-purple)](https://shunshi.ai)

Part of [naming-mcp](https://github.com/shunshi-ai/naming-mcp) — repo README in
[English](https://github.com/shunshi-ai/naming-mcp/blob/main/README.md) ·
[简体中文](https://github.com/shunshi-ai/naming-mcp/blob/main/README.zh-CN.md) ·
[日本語](https://github.com/shunshi-ai/naming-mcp/blob/main/README.ja.md) ·
[한국어](https://github.com/shunshi-ai/naming-mcp/blob/main/README.ko.md).

## Install

```bash
npm install shunshi-naming-core
```

Pulls in [`shunshi-kangxi-core`](https://www.npmjs.com/package/shunshi-kangxi-core) for
stroke counts. No network at runtime.

## Why Kangxi strokes matter here

五格 is **defined on 康熙笔画**, which is not the modern stroke count: 万 is 3 strokes today
and 15 by Kangxi convention (萬), 学 is 8 and 16 (學). Compute the grids from modern counts
and every number, the 三才 configuration, and the total are wrong together.

## API

### `scoreName(surname, given, options?): ScoreResult`

```typescript
import { scoreName } from 'shunshi-naming-core';

const r = scoreName('顾', '学盈', {
  xiYong: ['水', '木'],   // favourable elements from the birth chart (optional)
  jiShen: ['土', '火'],   // unfavourable ones (optional)
  zodiac: '龙',           // 生肖 or its branch — '龙' / '辰' / '龍' all work (optional)
});
```

Returns:

| Field | What |
|---|---|
| `scores` | `{ shuli, sancai, bazi, zodiac, total }` — 0-100 each; `bazi`/`zodiac` are `null` when not supplied |
| `grids` | The five grids, each with its number, element, grade, classical verse, full reading, keywords and the life stage it governs |
| `raw_grids` | Just the five numbers |
| `sancai` | Configuration, grade, and the derived 天→人 / 人→地 relations |
| `bazi_match` | Hit/clash characters and a generated verdict sentence stating the facts it rests on |
| `zodiac_match` | Per-character verdicts with the triggering radicals and reasons |
| `yunshi` | 基础运 / 成功运 / 社交运 — grade, basis and reading for each |
| `phonetics` | Per-character tones and a note on how the name reads aloud |
| `chars` | Per character: Kangxi strokes, element, radical, reading, Bopomofo, definition, glyph structure |

Weights are 八字 0.35 / 数理 0.28 / 生肖 0.20 / 三才 0.17. Missing dimensions are dropped
and the rest renormalised.

Throws if the name is outside 1-2 + 1-2 characters, or if a character is off-table — a
dropped character would silently produce a wrong chart.

### `wuge(surnameStrokes, givenStrokes): Grids`

The five-grid formula alone, for callers that already have stroke counts. Handles
single/compound surname × single/double given name.

```typescript
wuge([7], [11, 12]);        // { tian: 8, ren: 18, di: 23, wai: 13, zong: 30 }
wuge([15, 17], [10]);       // compound surname 欧阳娜
```

### `sancai(tian, ren, di): Sancai`

The 三才 configuration and its grade. **A 125-entry lookup, not a derivation** — 木金水
reads as 半吉 by the generation/restraint rules but the tradition grades it 大凶.

### `shuliEntry(n)` · `shuliLevel(n)` · `shuliWuxing(n)`

The 81-number system: full entry, grade (大吉/吉/半吉/凶/大凶), and element by last digit.
Numbers above 81 reduce by 80 per convention.

### `judgeChar(zodiac, char)` · `judgeCharAllZodiacs(char)` · `evaluateZodiac(...)`

生肖姓名学. Branch relations (三合/三会/六合 vs 六冲/六害/相刑) are derived and weighted
double; habit categories are a curated table with contested doctrine excluded. A
character's own branch radical is always neutral.

### `phonetics(chars)`

Tone analysis for a name — the level plus a sentence that states the tones rather than
just concluding about them.

## Notes for porters

Python's `round()` uses banker's rounding; `Math.round` does not. Scores land on `.5`
constantly, and ignoring this puts 63 of 200 names one point off. This package uses a
`pyRound` helper throughout the scoring path.

## Limits

Name numerology is a cultural practice, not a predictive science. 五格/三才 specifically is
Kumasaki Kenou's 1928 system, modern and Japanese in origin. The 八字 dimension has only
three levels, so totals jump between fixed values. ~40% of characters carry no element
attribution and are reported as unknown rather than guessed.

## License

MIT © [Shunshi.AI](https://shunshi.ai)
