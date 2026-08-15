# shunshi-naming-mcp

> 🇨🇳 Give your AI agent Chinese name scoring — 五格剖象 · 三才 · 81 数理 · 生肖 · 八字喜用, computed on real 康熙笔画. An open-source MCP server, offline.

[![npm](https://img.shields.io/npm/v/shunshi-naming-mcp)](https://www.npmjs.com/package/shunshi-naming-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Powered by Shunshi.AI](https://img.shields.io/badge/powered%20by-Shunshi.AI-purple)](https://shunshi.ai)

Part of [naming-mcp](https://github.com/shunshi-ai/naming-mcp) — repo README in
[English](https://github.com/shunshi-ai/naming-mcp/blob/main/README.md) ·
[简体中文](https://github.com/shunshi-ai/naming-mcp/blob/main/README.zh-CN.md) ·
[日本語](https://github.com/shunshi-ai/naming-mcp/blob/main/README.ja.md) ·
[한국어](https://github.com/shunshi-ai/naming-mcp/blob/main/README.ko.md).

## Setup

**Claude Desktop / Cursor / Cline:**

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

**Claude Code:**

```bash
claude mcp add shunshi-naming -- npx -y shunshi-naming-mcp
```

No API key, no network at runtime.

## Why the model needs this

Ask an LLM to score a Chinese name and it produces five-grid numbers that are confidently
wrong — because **五格 is defined on 康熙笔画, not modern stroke counts**. 万 is 3 strokes
today and **15** by Kangxi convention (萬); 学 is 8 and **16** (學). One wrong count and
every grid, the 三才 configuration and the total are wrong with it.

This server replaces guessing with lookup. Nothing here is generated: stroke counts,
auspiciousness grades and the 125-entry 三才 table are all data. The model's job is to
explain the result, not to produce it.

## Tools

### `scoreName`

Full four-dimension score: 八字喜用 (0.35) · 五格数理 (0.28) · 生肖姓名学 (0.20) · 三才配置
(0.17). Returns per-character detail, all five grids with their 81-number readings, the
三才 configuration, the three derived fortunes (基础运/成功运/社交运), and a tone analysis.

The 八字 and 生肖 dimensions are optional — without them the score renormalises over the
remaining two and reports which dimensions were left out.

> 帮我看看「顾学盈」这个名字，五格三才怎么样？

Pair with [`shunshi-bazi-mcp`](https://www.npmjs.com/package/shunshi-bazi-mcp) to compute
the birth chart first and feed the favourable elements straight in.

### `suggestNameChars`

Candidate characters filtered by the stroke count or element the numerology actually
needs — each with its reading and definition, so the model can choose on meaning as well
as on numbers. Returns the pool; composing and re-checking the name is the model's job.

> 孩子属龙，八字喜水木，从 12 画属木的字里挑几个配「李」姓。

### `checkZodiacFit`

One character judged against all twelve signs, or one sign in detail, with the triggering
radicals and the reason for each — so the judgement can be checked rather than believed.

> 「梓」这个字对属虎的孩子合适吗？

### `explainShuli`

What a number means in the 81-number system: grade, element, classical verse, full
reading, keywords. Also accepts stroke counts directly and computes the five grids.

## Honest limits

Name numerology is a cultural practice, not a predictive science — results are for
cultural understanding and entertainment, not advice about a person. Every response
carries this disclaimer so the model passes it on.

## Related

| Package | What |
|---|---|
| [`shunshi-naming-core`](https://www.npmjs.com/package/shunshi-naming-core) | The scoring engine behind this server |
| [`shunshi-kangxi-mcp`](https://www.npmjs.com/package/shunshi-kangxi-mcp) | 康熙字典 dictionary MCP server |
| [`shunshi-bazi-mcp`](https://www.npmjs.com/package/shunshi-bazi-mcp) | 八字 / 四柱推命 / 사주팔자 chart MCP server |
| [`shunshi-zeri-mcp`](https://www.npmjs.com/package/shunshi-zeri-mcp) | 择日 — auspicious date selection |

Built by [Shunshi.AI](https://shunshi.ai) — AI-powered Chinese metaphysics in 中文 / English / 日本語 / 한국어.

## License

MIT © [Shunshi.AI](https://shunshi.ai)
