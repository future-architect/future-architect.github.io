// 連結後の CSS（public/css/site.css）を見て、`@media` の上書きを後ろの規則が打ち消している形を止める (#3359)。
//
// 幅で値を変えるときは、素の規則を先に書き、`@media` の規則を後ろに置いて上書きする。
// 詳細度が同じなので、勝ち負けは書き順だけで決まる。素の規則が `@media` より後ろに来ると、
// `@media` の宣言はどの幅でも効かなくなる。ビルドもエラーにならず、画面を見るまで気づけない。
//
// 見るのは「同じセレクタ・同じプロパティ」の組だけ。別のセレクタが同じ要素に当たるかは
// HTML を見ないと分からないので、ここでは扱わない。
// 後ろの規則の条件が前の `@media` の条件をすべて含むとき（条件なし、または幅の範囲が広い）に止める。
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const { parseRules, condition, covers } = createRequire(import.meta.url)(
  './scripts/lib/css_rules.js',
);

const FILE = 'public/css/site.css';
const rules = parseRules(readFileSync(FILE, 'utf8'));

const problems = [];
const seen = new Set();
rules.forEach((m, i) => {
  const cm = condition(m.ctx);
  if (!cm.media) return;
  for (let j = i + 1; j < rules.length; j++) {
    const p = rules[j];
    const cp = condition(p.ctx);
    if (cp.layer !== cm.layer) continue;
    if (cp.lo > cm.lo || cp.hi < cm.hi) continue;
    if (!cp.other.every((o) => cm.other.includes(o))) continue;
    const shared = p.sels.filter((s) => m.sels.includes(s));
    if (!shared.length) continue;
    for (const dm of m.decls) {
      if (dm.important) continue;
      const hit = p.decls.find((dp) => covers(dp.prop, dm.prop) && !dp.important);
      if (!hit) continue;
      const key = `${shared[0]}|${dm.prop}|${m.ctx.join(' ')}`;
      if (seen.has(key)) continue;
      seen.add(key);
      problems.push({
        sel: shared[0],
        prop: dm.prop,
        by: hit.prop,
        media: m.ctx.join(' '),
        after: p.ctx.join(' ') || '（条件なし）',
      });
    }
  }
});

if (problems.length) {
  console.error(`後ろの規則に打ち消されている @media の宣言が ${problems.length} 件あります。\n`);
  problems.forEach((x) =>
    console.error(
      `  ${x.sel} { ${x.prop} }  ${x.media}\n    ← 後ろの ${x.after} の ${x.sel} { ${x.by} } が打ち消す`,
    ),
  );
  console.error('\n@media の規則は、上書きする相手の素の規則より後ろに置いてください。');
  process.exit(1);
}
console.log('後ろの規則に打ち消されている @media の宣言はありません');
