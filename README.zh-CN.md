# naming-mcp

<div align="center">

[![English](https://img.shields.io/badge/-English-555?style=flat-square)](README.md) ·
**简体中文** ·
[![日本語](https://img.shields.io/badge/-%E6%97%A5%E6%9C%AC%E8%AA%9E-555?style=flat-square)](README.ja.md)
[![한국어](https://img.shields.io/badge/-%ED%95%9C%EA%B5%AD%EC%96%B4-555?style=flat-square)](README.ko.md)

</div>

> 🇨🇳 **姓名学测名** — 五格剖象 · 三才配置 · 81 数理 · 生肖姓名学 · 八字喜用
>
> [Shunshi.AI](https://shunshi.ai) / 顺时 测名工具所用的引擎，开源发布。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Powered by Shunshi.AI](https://img.shields.io/badge/powered%20by-Shunshi.AI-purple)](https://shunshi.ai)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](#)

---

## 两个 npm 包

| 包 | 是什么 | 安装 |
|---|---|---|
| **[`shunshi-naming-core`](./packages/naming-core)** | 纯 TypeScript 打分引擎。离线、确定性。 | `npm install shunshi-naming-core` |
| **[`shunshi-naming-mcp`](./packages/naming-mcp)** | 包装核心库的 [MCP](https://modelcontextprotocol.io/) 服务器。Claude Desktop / Cursor / Cline / Claude Code 可用。 | `npx -y shunshi-naming-mcp` |

与 [Shunshi.AI 测名工具](https://shunshi.ai/workspace/naming) 同一套引擎，每次发布都与生产后端对拍。

---

## 为什么做这个

让大模型给中文名打分，它会自信地算出一套**错的**五格 —— 因为**五格是建立在康熙笔画上的，不是现代笔画**，而这两者恰好在最要紧的那些字上不一样：

| 字 | 现代笔画 | 康熙笔画 |
|---|---|---|
| 万 | 3 | **15**（萬） |
| 学 | 8 | **16**（學） |
| 丽 | 7 | **19**（麗） |

笔画一错，每一格、三才配置、总分全跟着错。这个包是查表，不是猜。

四个维度加权：

| 维度 | 权重 | 含义 |
|---|---|---|
| **八字喜用** | 0.35 | 名字用字的五行是否落在命局喜用方向 |
| **五格数理** | 0.28 | 天/人/地/外/总 五格及其 81 数理解读 |
| **生肖姓名学** | 0.20 | 字根对生肖的宜忌 |
| **三才配置** | 0.17 | 天-人-地 三格的五行配置 |

八字与生肖两维可选 —— 没有生辰时按剩下两维重新归一，并明确告诉调用方少算了什么。

### 几条设计原则

- **全部查表，没有一处靠猜。** 没有任何模型参与决定笔画或吉凶档位。大模型只在这些真值之上写解读文案，绝不生产真值。
- **三才是 125 条表，不是推导。** 它曾经按五行生克规则算，那是错的：木金水 按规则是一克一生（半吉），而行业口径判**大凶**。表里编码的是历代累积的断语，不是一条可推导的规则。改成查表前，10 个抽样名字有 8 个档位与行业口径不符。
- **生肖是加权，不是一票否决。** 地支关系（三合/六冲…）权重是习性规则的两倍 —— 「减」对属龙判忌，是因为辰戌六冲压过「龙得水而腾」，而不是因为它带个三点水就判成参半。但如果对立的两条**都来自地支层**（「翔」对属兔：羊三合 vs 羽卯酉冲），则保持参半 —— 那本来就是两说，压成一边等于编造确定性。
- **有分歧的一律不收。** 牛忌车、龙忌门、鸡宜小、蛇忌水、鼠忌山、猪忌辶 全部排除。本命字根一律中性，因为各派在这里的说法直接互斥。

---

## 快速开始

### 在自己的应用里用

```bash
npm install shunshi-naming-core
```

```typescript
import { scoreName } from 'shunshi-naming-core';

const r = scoreName('顾', '学盈', {
  xiYong: ['水', '木'],   // 八字喜用
  jiShen: ['土', '火'],   // 八字忌神
  zodiac: '龙',
});

console.log(r.scores);          // { shuli: 56, sancai: 35, bazi: 100, zodiac: 82, total: 73 }
console.log(r.grids.ren.num);   // 37
console.log(r.sancai.combo);    // 木金土
console.log(r.bazi_match.verdict_text);
// 学（水）· 盈（水）—— 正落在喜用水、木上。命局缺的那一口气，名字替它补上了…
```

→ 完整 API 说明：[`packages/naming-core/README.md`](./packages/naming-core/README.md)

### 让 Claude / Cursor / Cline 会测名

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

**Claude Code** 用户：

```bash
claude mcp add shunshi-naming -- npx -y shunshi-naming-mcp
```

然后直接问：

> 帮我看看「顾学盈」这个名字，五格三才怎么样？
>
> 孩子属龙，八字喜水木，帮我从 12 画属木的字里挑几个配「李」姓。
>
> 「梓」这个字对属虎的孩子合适吗？

配合 [`shunshi-bazi-mcp`](https://www.npmjs.com/package/shunshi-bazi-mcp) 使用，模型可以先排八字取喜用神，再直接喂给测名。

---

## 提供给模型的工具

| 工具 | 作用 |
|---|---|
| `scoreName` | 完整四维打分：逐字详情、五格及各格解读、三才、三条运势（基础运/成功运/社交运）、音律分析。 |
| `suggestNameChars` | 按数理真正需要的笔画或五行筛候选字。只给字库，组名和解释是模型的活。 |
| `checkZodiacFit` | 单字对十二生肖的宜忌一览，带命中字根与逐条理由。 |
| `explainShuli` | 某个数在 81 数理里是什么 —— 吉凶档、五行、诗号、完整解释。也可直接传笔画算五格。 |

---

## 验证

```bash
npm install
npm run build
npm test          # 33 项单元测试 + 200 个姓名的跨语言对拍
npm run smoke -w shunshi-naming-mcp   # 走真实 MCP stdio 协议的端到端测试
```

对拍套件用 Shunshi.AI 生产 Python 引擎生成的基准跑 200 个姓名 —— 20 个手选覆盖全部结构形态（单/复姓 × 单/双名、任/单/区/朴 姓氏专读、有无生辰），加 180 个定种子随机常见姓名。比对五格数字与档位、三才配置、四个分项与总分、八字判定**及其生成的文案**、逐字生肖判定、三条运势、音律分析。任何偏差都会让构建失败。

> 如果你自己要移植，有一处值得知道：Python 的 `round()` 是银行家舍入，JS 的 `Math.round` 不是。这里的分数经常正好落在 `.5`（比如双字生肖分 (100+65)/2），直接移植会有 63/200 个姓名差整整 1 分。

---

## 把局限说清楚

- **姓名学是传统文化实践，不是科学预测。** 这些分数用于文化理解与娱乐，不构成关于某个人的任何建议。
- **五格/三才 是熊崎健翁 1928 年《姓名の神秘》那套**，属日本近代体系，并非中国古法。这里据此配权（两项合计 45%），低于我们自己引擎推导出的维度。
- **八字这一维目前只有三档**（命中率 0 / 0.5 / 1）。它是四维里最粗的，却接了最高权重，所以总分会在几个固定值之间跳。
- **约 40% 的字没有五行标注**，多为各派分歧的生僻字。这些字标为「未知」，不会随便给一个五行。

---

## Shunshi.AI 开源生态

| 仓库 | 内容 |
|---|---|
| [bazi-reader-mcp](https://github.com/shunshi-ai/bazi-reader-mcp) | 八字 / 四柱推命 / 사주팔자 排盘引擎 + MCP 服务器 |
| [kangxi-mcp](https://github.com/shunshi-ai/kangxi-mcp) | 康熙字典引擎 + MCP 服务器 |
| **naming-mcp** | 姓名打分 *(本仓库)* |
| [zeri-mcp](https://github.com/shunshi-ai/zeri-mcp) | 择日 —— 嫁娶 / 搬家 / 开业 吉日筛选 |
| [fate-bench](https://github.com/shunshi-ai/fate-bench) | 中华命理开放数据集与基准 |

由 **[Shunshi.AI 顺时](https://shunshi.ai)** 打造 —— AI 驱动的中华命理平台，支持 中文 / English / 日本語 / 한국어。

## 许可

MIT © Shunshi.AI
