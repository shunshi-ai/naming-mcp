/**
 * End-to-end stdio smoke test.
 *
 * Spawns the BUILT stdio.js server and drives it through the real MCP protocol using
 * the SDK client — what Claude Desktop / Cursor / Cline will actually do.
 *
 * Run: npm run smoke (after `npm run build`)
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STDIO_ENTRY = resolve(__dirname, '../dist/stdio.js');

const EXPECTED_TOOLS = ['scoreName', 'suggestNameChars', 'checkZodiacFit', 'explainShuli'];

function textOf(result: unknown): string {
  const content = (result as { content: Array<{ type: string; text?: string }> }).content;
  const first = content?.[0];
  if (!first || first.type !== 'text' || !first.text) throw new Error('Expected a text block');
  return first.text;
}

async function main() {
  console.log(`▸ Spawning: node ${STDIO_ENTRY}`);
  const transport = new StdioClientTransport({ command: 'node', args: [STDIO_ENTRY] });
  const client = new Client(
    { name: 'shunshi-naming-mcp-smoke', version: '0.0.0' },
    { capabilities: {} },
  );
  await client.connect(transport);
  console.log('▸ Connected to MCP server');

  const tools = await client.listTools();
  console.log(`\n[tools/list] ${tools.tools.length} tool(s):`);
  for (const t of tools.tools) console.log(`  • ${t.name}`);
  for (const name of EXPECTED_TOOLS) {
    if (!tools.tools.find((t) => t.name === name)) throw new Error(`Missing tool "${name}"`);
  }

  // 1) scoreName — full four-dimension run
  console.log('\n[tools/call] scoreName 顾学盈 (喜水木 / 忌土火 / 属龙)');
  const full = JSON.parse(textOf(await client.callTool({
    name: 'scoreName',
    arguments: { surname: '顾', given: '学盈', xiYong: ['水', '木'], jiShen: ['土', '火'], zodiac: '龙' },
  })));
  const r = full.测名;
  console.log(`  五格 天${r.grids.tian.num} 人${r.grids.ren.num} 地${r.grids.di.num} 外${r.grids.wai.num} 总${r.grids.zong.num}`);
  console.log(`  三才 ${r.sancai.combo} (${r.sancai.level})`);
  console.log(`  分项 ${JSON.stringify(r.scores)}`);
  if (typeof r.scores.total !== 'number') throw new Error('missing total score');
  if (r.scores.bazi === null || r.scores.zodiac === null) {
    throw new Error('expected all four dimensions to be scored');
  }
  if (full.未计入的维度 !== null) throw new Error('all four dimensions were supplied');
  if (!full.数据来源?.访问?.includes('shunshi.ai')) throw new Error('attribution block missing');
  if (!full.免责声明) throw new Error('disclaimer missing');

  // 2) scoreName without birth data — must renormalise, and say so
  console.log('\n[tools/call] scoreName 王伟 (无生辰)');
  const partial = JSON.parse(textOf(await client.callTool({
    name: 'scoreName',
    arguments: { surname: '王', given: '伟' },
  })));
  console.log(`  分项 ${JSON.stringify(partial.测名.scores)}`);
  console.log(`  未计入: ${JSON.stringify(partial.未计入的维度)}`);
  if (partial.测名.scores.bazi !== null) throw new Error('bazi should be null without xiYong');
  if (!Array.isArray(partial.未计入的维度) || partial.未计入的维度.length !== 2) {
    throw new Error('should report both missing dimensions');
  }

  // 3) suggestNameChars
  console.log('\n[tools/call] suggestNameChars 12画 木');
  const sug = JSON.parse(textOf(await client.callTool({
    name: 'suggestNameChars',
    arguments: { strokes: 12, wuxing: '木', limit: 8 },
  })));
  console.log(`  候选 ${sug.候选字数} 字: ${sug.候选字.map((c: { 字: string }) => c.字).join(' ')}`);
  if (!sug.候选字.length) throw new Error('no candidates returned');
  for (const c of sug.候选字) {
    if (c.康熙笔画 !== 12 || c.五行 !== '木') throw new Error(`filter leaked: ${c.字}`);
  }

  // 4) checkZodiacFit — all twelve, then one
  console.log('\n[tools/call] checkZodiacFit 减');
  const zAll = JSON.parse(textOf(await client.callTool({
    name: 'checkZodiacFit',
    arguments: { char: '减' },
  })));
  if (zAll.十二生肖一览.length !== 12) throw new Error('expected 12 signs');
  const dragon = zAll.十二生肖一览.find((z: { zodiac: string }) => z.zodiac === '龙');
  console.log(`  属龙: ${dragon.verdict} (${dragon.reasons.length} 条理由)`);
  if (dragon.verdict !== '忌') throw new Error(`expected 忌 for the dragon, got ${dragon.verdict}`);

  console.log('\n[tools/call] checkZodiacFit 减 (只看属龙)');
  const zOne = JSON.parse(textOf(await client.callTool({
    name: 'checkZodiacFit',
    arguments: { char: '减', zodiac: '辰' },
  })));
  if (zOne.生肖 !== '龙') throw new Error('branch input should normalise to 龙');

  // 5) explainShuli — by number, and by stroke counts
  console.log('\n[tools/call] explainShuli 37');
  const sh = JSON.parse(textOf(await client.callTool({
    name: 'explainShuli',
    arguments: { number: 37 },
  })));
  console.log(`  37: ${sh.吉凶} · ${sh.诗号} · ${sh.五行}`);
  if (!sh.解释 || sh.解释.length < 20) throw new Error('reading too short');

  console.log('\n[tools/call] explainShuli by strokes (7 + 11,12)');
  const grids = JSON.parse(textOf(await client.callTool({
    name: 'explainShuli',
    arguments: { surnameStrokes: [7], givenStrokes: [11, 12] },
  })));
  console.log(`  五格: ${Object.entries(grids.五格).map(([k, v]) => `${k}${(v as { 数: number }).数}`).join(' ')}`);
  if (grids.五格.zong.数 !== 30) throw new Error(`总格 should be 30, got ${grids.五格.zong.数}`);

  // 6) an off-table character must degrade gracefully, not crash the server
  console.log('\n[tools/call] scoreName with an off-table character');
  const bad = JSON.parse(textOf(await client.callTool({
    name: 'scoreName',
    arguments: { surname: '王', given: '\u{2A6B2}' },
  })));
  if (!bad.错误) throw new Error('expected a structured error');
  console.log(`  → 错误: ${bad.错误}`);

  await client.close();
  console.log('\n✓ smoke passed — all 4 tools reachable over stdio.');
}

main().catch((err) => {
  console.error('\n✗ smoke failed:', err);
  process.exit(1);
});
