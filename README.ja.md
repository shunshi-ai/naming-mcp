# naming-mcp

<div align="center">

[![English](https://img.shields.io/badge/-English-555?style=flat-square)](README.md)
[![简体中文](https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-555?style=flat-square)](README.zh-CN.md) ·
**日本語** ·
[![한국어](https://img.shields.io/badge/-%ED%95%9C%EA%B5%AD%EC%96%B4-555?style=flat-square)](README.ko.md)

</div>

> 🇯🇵 **姓名判断 (せいめいはんだん)** — 五格剖象 · 三才配置 · 81 数理 · 十二支姓名学 · 八字喜用
>
> [Shunshi.AI](https://shunshi.ai) / 順時 の姓名判断ツールで稼働しているエンジンを、そのままオープンソース化したものです。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Powered by Shunshi.AI](https://img.shields.io/badge/powered%20by-Shunshi.AI-purple)](https://shunshi.ai)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](#)

---

## 2 つの npm パッケージ

| パッケージ | 内容 | インストール |
|---|---|---|
| **[`shunshi-naming-core`](./packages/naming-core)** | 純粋な TypeScript の採点エンジン。オフライン・決定論的。 | `npm install shunshi-naming-core` |
| **[`shunshi-naming-mcp`](./packages/naming-mcp)** | コアを包む [MCP](https://modelcontextprotocol.io/) サーバー。Claude Desktop / Cursor / Cline / Claude Code 用。 | `npx -y shunshi-naming-mcp` |

[Shunshi.AI の姓名判断ツール](https://shunshi.ai/workspace/naming)と同一のエンジンで、リリースごとに本番環境との整合性テストを行っています。

---

## なぜ作ったか

LLM に中国語の名前を採点させると、自信たっぷりに**誤った**五格を出してきます。**五格は康熙画数の上に定義されており、現代の画数ではない**からです。そして両者は、よりによって重要な漢字ほど食い違います。

| 漢字 | 現代画数 | 康熙画数 |
|---|---|---|
| 万 | 3 | **15**（萬） |
| 学 | 8 | **16**（學） |
| 麗 | 7 | **19**（麗） |

画数を一つ間違えれば、各格も三才配置も総合点もすべて連鎖して狂います。このパッケージは推測せず、表を引きます。

4 つの次元を重み付けして合成します。

| 次元 | 重み | 内容 |
|---|---|---|
| **八字喜用** | 0.35 | 名前の漢字の五行が命式の喜用の方向に乗っているか |
| **五格数理** | 0.28 | 天/人/地/外/総の五格と 81 数理による解釈 |
| **十二支姓名学** | 0.20 | 字根（構成部品）の十二支に対する吉凶 |
| **三才配置** | 0.17 | 天-人-地 三格の五行配置 |

八字と十二支の 2 次元は任意です。生年月日がない場合は残る 2 次元で再正規化し、何を計算に入れなかったかを明示します。

### 設計上の約束

- **すべて表引きで、推測は一切ありません。** 画数や吉凶の判定にモデルは一切関与しません。言語モデルはこれらの確定値の上に文章を書くだけで、確定値そのものを生み出すことはありません。
- **三才は 125 件の表であり、導出ではありません。** かつては五行の相生相剋から計算していましたが、それは誤りでした。木金水 は規則上は一剋一生（半吉）ですが、伝統的な判定は**大凶**です。表が符号化しているのは歴代積み上げられた断案であり、導出可能な規則ではありません。修正前は 10 件の抽出サンプルのうち 8 件が業界の判定と食い違っていました。
- **十二支は重み付けであり、拒否権ではありません。** 地支の関係（三合・六冲…）は習性規則の 2 倍の重みを持ちます。「减」が辰年で忌となるのは、辰戌六冲が「龍は水を得て昇る」を上回るからであって、三水偏があるから参半になるのではありません。ただし対立する 2 条が**ともに地支層**である場合（「翔」と卯年：羊の三合 vs 羽の卯酉冲）は参半のままです。それは本来両説あるものであり、片方に潰すのは確実性の捏造になります。
- **見解の分かれるものは採用しません。** 牛忌车・龙忌门・鸡宜小・蛇忌水・鼠忌山・猪忌辶 はいずれも除外。本命字根は常に中立です。諸派の説がここでは真っ向から矛盾しているためです。

---

## クイックスタート

### 自分のアプリで使う

```bash
npm install shunshi-naming-core
```

```typescript
import { scoreName } from 'shunshi-naming-core';

const r = scoreName('顾', '学盈', {
  xiYong: ['水', '木'],   // 命式の喜用
  jiShen: ['土', '火'],   // 忌神
  zodiac: '龙',
});

console.log(r.scores);          // { shuli: 56, sancai: 35, bazi: 100, zodiac: 82, total: 73 }
console.log(r.grids.ren.num);   // 37
console.log(r.sancai.combo);    // 木金土
```

→ 詳細な API リファレンス：[`packages/naming-core/README.md`](./packages/naming-core/README.md)

### Claude / Cursor / Cline に姓名判断をさせる

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

**Claude Code** の場合：

```bash
claude mcp add shunshi-naming -- npx -y shunshi-naming-mcp
```

あとはこう尋ねるだけです。

> 「顧学盈」という名前の五格と三才を見てほしい。
>
> 子どもは辰年、命式は水と木を喜ぶ。「李」姓に合う候補を挙げて。
>
> 「梓」は寅年の子に向いている漢字？

[`shunshi-bazi-mcp`](https://www.npmjs.com/package/shunshi-bazi-mcp) と併用すれば、モデルがまず命式を立てて喜用神を取り、そのまま姓名判断に渡せます。

---

## モデルに公開されるツール

| ツール | 機能 |
|---|---|
| `scoreName` | 4 次元の完全な採点。1 字ごとの詳細、五格と各格の解釈、三才、3 つの運勢（基礎運/成功運/社交運）、音律分析。 |
| `suggestNameChars` | 数理が実際に必要とする画数・五行で候補漢字を絞り込みます。返すのは候補群で、名前を組み立てて説明するのはモデルの仕事です。 |
| `checkZodiacFit` | 1 字を十二支すべてに対して判定。命中した字根と各理由付き。 |
| `explainShuli` | ある数が 81 数理で何を意味するか —— 吉凶・五行・詩号・完全な解釈。画数を渡して五格を計算させることもできます。 |

---

## 検証

```bash
npm install
npm run build
npm test          # 33 件のユニットテスト + 200 名分の言語間整合性テスト
npm run smoke -w shunshi-naming-mcp   # 実際の MCP stdio プロトコル経由のテスト
```

整合性テストは Shunshi.AI 本番 Python エンジンから生成したフィクスチャで 200 名分を照合します。構造のすべての形（単姓/複姓 × 一字名/二字名、任・单・区・朴 の姓読み分け、生年月日の有無）を網羅する手選び 20 件に、シード固定のランダムな一般的姓名 180 件を加えたものです。五格の数値と等級、三才配置、4 次元の得点と総合点、八字の判定**とその生成文**、1 字ごとの十二支判定、3 つの運勢、音律分析を比較します。差分が 1 つでもあればビルドは失敗します。

> 自分で移植する方へ、一点だけ：Python の `round()` は銀行家丸めですが、JavaScript の `Math.round` は違います。ここでの得点は `.5` にしょっちゅう着地するため（二字名の十二支得点 (100+65)/2 など）、素朴に移植すると 200 名中 63 名がちょうど 1 点ずれます。

---

## 限界を正直に

- **姓名判断は文化的実践であり、科学的予測ではありません。** これらの点数は文化的理解と娯楽のためのもので、特定の個人についての助言ではありません。
- **五格/三才 は熊崎健翁の 1928 年『姓名の神秘』の体系**であり、日本近代のもので中国古法ではありません。ここでは相応の重み（両者で計 45%）とし、自前のエンジンが導出する次元より低く配置しています。
- **八字の次元は現状 3 段階のみ**（的中率 0 / 0.5 / 1）。4 次元中最も粗いのに最大の重みを持つため、総合点はいくつかの固定値の間を飛びます。
- **約 40% の漢字には五行の帰属がありません。** 多くは諸派の見解が分かれる生僻字です。これらは推測せず「不明」として報告します。

---

## Shunshi.AI オープンソースエコシステム

| リポジトリ | 内容 |
|---|---|
| [bazi-reader-mcp](https://github.com/shunshi-ai/bazi-reader-mcp) | 八字 / 四柱推命 / 사주팔자 の命式計算エンジン + MCP サーバー |
| [kangxi-mcp](https://github.com/shunshi-ai/kangxi-mcp) | 康熙字典エンジン + MCP サーバー |
| **naming-mcp** | 姓名判断 *(本リポジトリ)* |
| [zeri-mcp](https://github.com/shunshi-ai/zeri-mcp) | 択日 —— 婚礼 / 引越し / 開業の吉日選定 |
| [fate-bench](https://github.com/shunshi-ai/fate-bench) | 中国命理学のオープンデータセットとベンチマーク |

**[Shunshi.AI 順時](https://shunshi.ai)** が開発 —— AI による中国命理学プラットフォーム。中文 / English / 日本語 / 한국어 対応。

## ライセンス

MIT © Shunshi.AI
