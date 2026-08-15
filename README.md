# naming-mcp

<div align="center">

**English** ·
[![简体中文](https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-555?style=flat-square)](README.zh-CN.md)
[![日本語](https://img.shields.io/badge/-%E6%97%A5%E6%9C%AC%E8%AA%9E-555?style=flat-square)](README.ja.md)
[![한국어](https://img.shields.io/badge/-%ED%95%9C%EA%B5%AD%EC%96%B4-555?style=flat-square)](README.ko.md)

</div>

> 🇨🇳 **姓名学 (Chinese name numerology)** ・ 🇯🇵 **姓名判断 (せいめいはんだん)** ・ 🇰🇷 **성명학 (姓名學)**
>
> Score a Chinese name the way practitioners actually do — and give your AI agent the same ability. Open-sourced by [Shunshi.AI](https://shunshi.ai) / 顺时.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Powered by Shunshi.AI](https://img.shields.io/badge/powered%20by-Shunshi.AI-purple)](https://shunshi.ai)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](#)

---

## Two published npm packages

| Package | What it is | Install |
|---|---|---|
| **[`shunshi-naming-core`](./packages/naming-core)** | Pure TypeScript scoring engine. Offline, deterministic. | `npm install shunshi-naming-core` |
| **[`shunshi-naming-mcp`](./packages/naming-mcp)** | [Model Context Protocol](https://modelcontextprotocol.io/) server wrapping the core. For Claude Desktop / Cursor / Cline / Claude Code. | `npx -y shunshi-naming-mcp` |

Same engine as [Shunshi.AI's naming tool](https://shunshi.ai/workspace/naming), parity-tested against that production backend on every release.

---

## Why this exists

Ask an LLM to score a Chinese name and it will confidently produce five-grid numbers
that are wrong — because **五格 is defined on 康熙笔画, not on modern stroke counts**, and
the two differ for exactly the characters that matter:

| Character | Modern | Kangxi |
|---|---|---|
| 万 | 3 | **15** (萬) |
| 学 | 8 | **16** (學) |
| 丽 | 7 | **19** (麗) |

Get the stroke count wrong and every grid, the 三才 configuration, and the whole score
are wrong with it. This package looks the counts up instead of guessing.

Four dimensions are scored and weighted:

| Dimension | Weight | What it is |
|---|---|---|
| **八字喜用** | 0.35 | Do the given name's elements fall on the favourable side of the birth chart? |
| **五格数理** | 0.28 | The five grids (天/人/地/外/总) and their 81-number readings |
| **生肖姓名学** | 0.20 | Component-radical suitability for the zodiac sign |
| **三才配置** | 0.17 | The 天-人-地 element configuration |

The 八字 and 生肖 dimensions are optional — without birth data the score renormalises
over the remaining two, and says so.

### Design commitments

- **Everything is a lookup, nothing is a guess.** No model decides a stroke count or an
  auspiciousness grade. Language models write prose on top of these values, never
  produce them.
- **三才 is a 125-entry table, not a derivation.** It was once computed from the
  element generation/restraint rules, and that was wrong: 木金水 reads as one restraint
  plus one generation (半吉) by the rules, yet the tradition grades it **大凶**. The
  table encodes centuries of accumulated judgements, not a derivable rule. Testing
  against reference tools put 8 of 10 sample names in a different grade before the fix.
- **The zodiac layer is weighted, not vetoed.** Branch relations (三合/六冲…) count
  double against habit rules — 「减」 for a dragon is 忌 because 辰戌六冲 outweighs
  "the dragon favours water", not 参半 because it happens to contain 氵. But two
  *branch-layer* hits in opposition (「翔」 for a rabbit: 羊 三合 vs 羽 卯酉冲) stay
  参半, because that is a genuine stand-off and flattening it would invent certainty.
- **Contested doctrine is left out.** 牛忌车, 龙忌门, 鸡宜小, 蛇忌水, 鼠忌山, 猪忌辶 are
  all excluded. A character's own branch radical is always neutral, because the schools
  contradict each other outright there.

---

## Quick start

### Use the engine in your own app

```bash
npm install shunshi-naming-core
```

```typescript
import { scoreName } from 'shunshi-naming-core';

const r = scoreName('顾', '学盈', {
  xiYong: ['水', '木'],   // favourable elements from the birth chart
  jiShen: ['土', '火'],   // unfavourable ones
  zodiac: '龙',
});

console.log(r.scores);          // { shuli: 56, sancai: 35, bazi: 100, zodiac: 82, total: 73 }
console.log(r.grids.ren.num);   // 37
console.log(r.sancai.combo);    // 木金土
console.log(r.bazi_match.verdict_text);
// 学（水）· 盈（水）—— 正落在喜用水、木上。命局缺的那一口气，名字替它补上了…
```

→ Full API reference: [`packages/naming-core/README.md`](./packages/naming-core/README.md)

### Give Claude / Cursor / Cline the ability to score names

```jsonc
{
  "mcpServers": {
    "shunshi-naming": {
      "command": "npx",
      "args": ["-y", "shunshi-naming-mcp"]
    }
  }
}
```

For **Claude Code**:

```bash
claude mcp add shunshi-naming -- npx -y shunshi-naming-mcp
```

Then ask:

> 帮我看看「顾学盈」这个名字，五格三才怎么样？
>
> Score the name 李梓涵 — the child is a dragon and the chart favours water and wood.
>
> 「佐藤」に合う、画数のいい名前の候補を挙げて。

Pair it with [`shunshi-bazi-mcp`](https://www.npmjs.com/package/shunshi-bazi-mcp) and the
model can compute the birth chart first, then feed the favourable elements straight into
the name score.

---

## Tools exposed to the model

| Tool | What it does |
|---|---|
| `scoreName` | Full four-dimension score with per-character detail, the five grids and their readings, 三才, the three derived fortunes (基础运/成功运/社交运), and a tone analysis. |
| `suggestNameChars` | Candidate characters filtered by the stroke count or element the numerology actually needs. Returns the pool — composing the name is the model's job. |
| `checkZodiacFit` | One character judged against all twelve signs, with the triggering radicals and the reason for each. |
| `explainShuli` | What a number means in the 81-number system — grade, element, classical verse, full reading. Also accepts stroke counts and computes the grids. |

---

## Verification

```bash
npm install
npm run build
npm test          # 33 unit tests + 200-name cross-language parity
npm run smoke -w shunshi-naming-mcp   # end-to-end over the real MCP stdio protocol
```

The parity suite runs 200 names against fixtures generated by Shunshi.AI's production
Python engine — 20 hand-picked to cover every structural shape (single/compound surname
× single/double given name, the surname-reading overrides 任/单/区/朴, with and without
birth data) plus 180 seeded-random common names. It compares the grids and their grades,
the 三才 configuration, all four dimension scores and the total, the 八字 verdict
*including its generated prose*, the per-character zodiac verdicts, the three fortunes
and the tone analysis. Any divergence fails the build.

> One detail worth knowing if you port this yourself: Python's `round()` uses banker's
> rounding and JavaScript's `Math.round` does not. Scores land on `.5` constantly — a
> two-character zodiac score of (100+65)/2 — and the naive port disagreed with production
> on 63 of 200 names by exactly one point.

---

## Honest limits

- **Name numerology is a cultural practice, not a predictive science.** These scores are
  for cultural understanding and entertainment. They are not advice about a person.
- **五格/三才 is Kumasaki Kenou's 1928 system** (熊崎健翁, 《姓名の神秘》) — modern and
  Japanese in origin, not ancient Chinese. It is weighted accordingly here (45% combined)
  against dimensions our own engine derives.
- **The 八字 dimension has only three levels** (hit rate 0 / 0.5 / 1). It is the coarsest
  of the four yet carries the highest weight, so totals jump between a few fixed values.
- **Roughly 40% of characters have no element attribution**, mostly rare ones where the
  classical schools disagree. Those are reported as unknown rather than assigned a guess.

---

## Part of the Shunshi.AI open-source ecosystem

| Repo | What |
|---|---|
| [bazi-reader-mcp](https://github.com/shunshi-ai/bazi-reader-mcp) | 八字 / 四柱推命 / 사주팔자 chart engine + MCP server |
| [kangxi-mcp](https://github.com/shunshi-ai/kangxi-mcp) | 康熙字典 dictionary engine + MCP server |
| **naming-mcp** | Chinese name scoring *(this repo)* |
| [zeri-mcp](https://github.com/shunshi-ai/zeri-mcp) | 择日 / date selection — weddings, moving, opening |
| [fate-bench](https://github.com/shunshi-ai/fate-bench) | Open datasets and benchmarks for Chinese metaphysics |

Built by **[Shunshi.AI](https://shunshi.ai)** — AI-powered Chinese metaphysics, in 中文 / English / 日本語 / 한국어.

## License

MIT © Shunshi.AI
