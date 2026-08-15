# naming-mcp

<div align="center">

[![English](https://img.shields.io/badge/-English-555?style=flat-square)](README.md)
[![简体中文](https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-555?style=flat-square)](README.zh-CN.md)
[![日本語](https://img.shields.io/badge/-%E6%97%A5%E6%9C%AC%E8%AA%9E-555?style=flat-square)](README.ja.md) ·
**한국어**

</div>

> 🇰🇷 **성명학 (姓名學)** — 오격부상 · 삼재배치 · 81 수리 · 십이지 성명학 · 사주 희용
>
> [Shunshi.AI](https://shunshi.ai) / 순시(順時) 작명 도구에서 실제로 돌아가는 엔진을 그대로 오픈소스로 공개합니다.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Powered by Shunshi.AI](https://img.shields.io/badge/powered%20by-Shunshi.AI-purple)](https://shunshi.ai)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](#)

---

## 두 개의 npm 패키지

| 패키지 | 내용 | 설치 |
|---|---|---|
| **[`shunshi-naming-core`](./packages/naming-core)** | 순수 TypeScript 채점 엔진. 오프라인, 결정론적. | `npm install shunshi-naming-core` |
| **[`shunshi-naming-mcp`](./packages/naming-mcp)** | 코어를 감싼 [MCP](https://modelcontextprotocol.io/) 서버. Claude Desktop / Cursor / Cline / Claude Code용. | `npx -y shunshi-naming-mcp` |

[Shunshi.AI 작명 도구](https://shunshi.ai/workspace/naming)와 동일한 엔진이며, 릴리스마다 프로덕션 백엔드와 일치성 테스트를 거칩니다.

---

## 왜 만들었나

LLM에게 한자 이름을 채점하게 하면 자신 있게 **틀린** 오격을 내놓습니다. **오격은 강희 획수 위에 정의되어 있지 현대 획수가 아니기** 때문이며, 하필 가장 중요한 글자들에서 둘이 어긋납니다.

| 한자 | 현대 획수 | 강희 획수 |
|---|---|---|
| 万 | 3 | **15** (萬) |
| 学 | 8 | **16** (學) |
| 丽 | 7 | **19** (麗) |

획수가 하나 틀리면 각 격도, 삼재 배치도, 총점도 줄줄이 틀립니다. 이 패키지는 추측하지 않고 표를 조회합니다.

네 가지 차원에 가중치를 두어 합산합니다.

| 차원 | 가중치 | 내용 |
|---|---|---|
| **사주 희용** | 0.35 | 이름 글자의 오행이 명국이 반기는 방향에 놓였는가 |
| **오격 수리** | 0.28 | 천/인/지/외/총 오격과 81 수리 해석 |
| **십이지 성명학** | 0.20 | 자근(구성 부품)의 띠에 대한 길흉 |
| **삼재 배치** | 0.17 | 천-인-지 세 격의 오행 배치 |

사주와 띠 두 차원은 선택입니다. 생년월일이 없으면 남은 두 차원으로 재정규화하고, 무엇을 빼고 계산했는지 명시합니다.

### 설계 원칙

- **전부 표 조회이며, 추측은 한 군데도 없습니다.** 획수나 길흉 등급 판정에 모델은 일절 관여하지 않습니다. 언어 모델은 이 확정값 위에 해설을 쓸 뿐, 확정값 자체를 만들어내지 않습니다.
- **삼재는 125개 항목의 표이지 도출이 아닙니다.** 한때 오행 상생상극 규칙으로 계산했지만 그것은 틀렸습니다. 木金水는 규칙상 일극일생(반길)이지만 전통적 판정은 **대흉**입니다. 표가 담고 있는 것은 역대 축적된 판단이지 도출 가능한 규칙이 아닙니다. 수정 전에는 표본 10개 중 8개가 업계 판정과 어긋났습니다.
- **십이지는 가중치이지 거부권이 아닙니다.** 지지 관계(삼합/육충…)는 습성 규칙의 두 배 무게를 갖습니다. 「减」이 용띠에게 흉인 것은 진술육충이 "용은 물을 얻어 오른다"를 눌렀기 때문이지, 삼수변이 있다고 반반이 되는 것이 아닙니다. 다만 대립하는 두 조건이 **모두 지지층**이면(「翔」과 토끼띠: 양의 삼합 vs 우의 묘유충) 반반으로 남깁니다. 그건 원래 두 설이 있는 것이고, 한쪽으로 뭉개면 확실성을 지어내는 셈입니다.
- **이견이 있는 것은 싣지 않습니다.** 牛忌车, 龙忌门, 鸡宜小, 蛇忌水, 鼠忌山, 猪忌辶 모두 제외했습니다. 본명 자근은 항상 중립입니다. 이 지점에서 여러 유파의 설이 정면으로 모순되기 때문입니다.

---

## 빠른 시작

### 직접 만든 앱에서 사용하기

```bash
npm install shunshi-naming-core
```

```typescript
import { scoreName } from 'shunshi-naming-core';

const r = scoreName('顾', '学盈', {
  xiYong: ['水', '木'],   // 명국의 희용
  jiShen: ['土', '火'],   // 기신
  zodiac: '龙',
});

console.log(r.scores);          // { shuli: 56, sancai: 35, bazi: 100, zodiac: 82, total: 73 }
console.log(r.grids.ren.num);   // 37
console.log(r.sancai.combo);    // 木金土
```

→ 전체 API 레퍼런스: [`packages/naming-core/README.md`](./packages/naming-core/README.md)

### Claude / Cursor / Cline에 작명 감정 붙이기

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

**Claude Code** 사용자:

```bash
claude mcp add shunshi-naming -- npx -y shunshi-naming-mcp
```

그다음 이렇게 물어보면 됩니다.

> 「顧學盈」이라는 이름의 오격과 삼재를 봐줘.
>
> 아이가 용띠이고 명국이 수와 목을 반긴다. 「李」 성에 맞는 후보를 골라줘.
>
> 「梓」는 범띠 아이에게 맞는 글자인가?

[`shunshi-bazi-mcp`](https://www.npmjs.com/package/shunshi-bazi-mcp)과 함께 쓰면 모델이 먼저 사주를 세워 희용신을 얻고, 그대로 작명 감정에 넘길 수 있습니다.

---

## 모델에 노출되는 도구

| 도구 | 기능 |
|---|---|
| `scoreName` | 4차원 전체 채점. 글자별 상세, 오격과 각 격의 해석, 삼재, 세 가지 운세(기초운/성공운/사교운), 음률 분석. |
| `suggestNameChars` | 수리가 실제로 필요로 하는 획수·오행으로 후보 글자를 추립니다. 반환하는 것은 후보군이며, 이름을 조합하고 설명하는 것은 모델의 몫입니다. |
| `checkZodiacFit` | 한 글자를 열두 띠 전체에 대해 판정. 적중한 자근과 각각의 이유 포함. |
| `explainShuli` | 어떤 수가 81 수리에서 무엇을 뜻하는지 —— 길흉 등급, 오행, 시호, 전체 해석. 획수를 넘겨 오격을 계산시킬 수도 있습니다. |

---

## 검증

```bash
npm install
npm run build
npm test          # 33개 유닛 테스트 + 이름 200개 언어 간 일치성 테스트
npm run smoke -w shunshi-naming-mcp   # 실제 MCP stdio 프로토콜을 통한 테스트
```

일치성 테스트는 Shunshi.AI 프로덕션 Python 엔진에서 생성한 픽스처로 이름 200개를 대조합니다. 모든 구조 형태(단성/복성 × 외자/두자 이름, 任·单·区·朴 성씨 독음 예외, 생년월일 유무)를 포괄하는 수작업 20개에, 시드 고정 랜덤 일반 이름 180개를 더한 것입니다. 오격 수치와 등급, 삼재 배치, 네 차원 점수와 총점, 사주 판정**과 그 생성 문장**, 글자별 띠 판정, 세 운세, 음률 분석을 비교합니다. 차이가 하나라도 있으면 빌드가 실패합니다.

> 직접 포팅하실 분을 위한 한 가지: Python의 `round()`는 은행가 반올림이고 JavaScript의 `Math.round`는 아닙니다. 이곳의 점수는 `.5`에 수시로 떨어지기 때문에(두 자 이름의 띠 점수 (100+65)/2 등), 단순 포팅하면 200개 중 63개가 정확히 1점씩 어긋납니다.

---

## 한계를 솔직히

- **성명학은 문화적 실천이지 과학적 예측이 아닙니다.** 이 점수는 문화적 이해와 오락을 위한 것이며, 특정 개인에 대한 조언이 아닙니다.
- **오격/삼재는 구마사키 겐오의 1928년 『姓名の神秘』 체계**로, 일본 근대의 것이지 중국 고법이 아닙니다. 여기서는 그에 맞는 가중치(둘 합쳐 45%)를 두어, 자체 엔진이 도출하는 차원보다 낮게 배치했습니다.
- **사주 차원은 현재 3단계뿐입니다**(적중률 0 / 0.5 / 1). 네 차원 중 가장 거친데 가장 큰 가중치를 갖기 때문에, 총점이 몇 개의 고정값 사이를 뜁니다.
- **약 40%의 한자에는 오행 귀속이 없습니다.** 대부분 유파 간 견해가 갈리는 벽자입니다. 이들은 추측하지 않고 「미상」으로 보고합니다.

---

## Shunshi.AI 오픈소스 생태계

| 저장소 | 내용 |
|---|---|
| [bazi-reader-mcp](https://github.com/shunshi-ai/bazi-reader-mcp) | 八字 / 四柱推命 / 사주팔자 명식 계산 엔진 + MCP 서버 |
| [kangxi-mcp](https://github.com/shunshi-ai/kangxi-mcp) | 강희자전 엔진 + MCP 서버 |
| **naming-mcp** | 이름 감정 *(이 저장소)* |
| [zeri-mcp](https://github.com/shunshi-ai/zeri-mcp) | 택일 —— 결혼 / 이사 / 개업 길일 선정 |
| [fate-bench](https://github.com/shunshi-ai/fate-bench) | 중국 명리학 오픈 데이터셋과 벤치마크 |

**[Shunshi.AI 순시](https://shunshi.ai)** 개발 —— AI 기반 중국 명리학 플랫폼. 中文 / English / 日本語 / 한국어 지원.

## 라이선스

MIT © Shunshi.AI
