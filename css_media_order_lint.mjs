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

const FILE = 'public/css/site.css';
const css = readFileSync(FILE, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

// 一括指定は、その名前で始まる個別指定も上書きする（margin は margin-top を消す）
const SHORTHANDS = new Set([
  'margin',
  'padding',
  'border',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'border-block',
  'border-inline',
  'background',
  'font',
  'flex',
  'grid',
  'gap',
  'transition',
  'animation',
  'overflow',
  'outline',
  'list-style',
  'text-decoration',
  'columns',
  'inset',
  'margin-block',
  'margin-inline',
  'padding-block',
  'padding-inline',
  'place-items',
  'place-content',
]);
const covers = (later, earlier) =>
  later === earlier || (SHORTHANDS.has(later) && earlier.startsWith(later + '-'));

// セレクタのリストを括弧の外のカンマで割る
function splitList(s) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') depth--;
    else if (s[i] === ',' && depth === 0) {
      out.push(s.slice(start, i));
      start = i + 1;
    }
  }
  out.push(s.slice(start));
  return out.map((x) => x.trim().replace(/\s+/g, ' ')).filter(Boolean);
}

// 入れ子のセレクタを親とつなぐ。親がリストなら :is() になる（ブラウザと同じ）
function resolve(parents, child) {
  if (!parents) return splitList(child);
  const p = parents.length === 1 ? parents[0] : `:is(${parents.join(', ')})`;
  return splitList(child).map((c) => (c.includes('&') ? c.replaceAll('&', p) : `${p} ${c}`));
}

// 規則を出てくる順に平らに並べる。ctx は外側の at-rule の前置き
const rules = [];
function walk(text) {
  const stack = [{ sels: null, ctx: [] }];
  let buf = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '{') {
      const prelude = buf.trim();
      buf = '';
      const top = stack[stack.length - 1];
      if (prelude.startsWith('@'))
        stack.push({ sels: top.sels, ctx: [...top.ctx, prelude], at: true });
      else {
        const frame = { sels: resolve(top.sels, prelude), ctx: top.ctx, decls: [] };
        rules.push(frame);
        stack.push(frame);
      }
    } else if (c === '}' || c === ';') {
      const top = stack[stack.length - 1];
      const decl = buf.trim();
      buf = '';
      if (decl && top.decls) {
        const k = decl.indexOf(':');
        if (k > 0)
          top.decls.push({
            prop: decl.slice(0, k).trim().toLowerCase(),
            important: /!important\s*$/.test(decl),
          });
      }
      if (c === '}') stack.pop();
    } else buf += c;
  }
}
walk(css);

// 条件を「幅の範囲」と「それ以外の条件の集合」に分ける
function condition(ctx) {
  let lo = 0;
  let hi = Infinity;
  const other = [];
  let layer = '';
  for (const at of ctx) {
    if (at.startsWith('@layer')) {
      layer += at;
      continue;
    }
    if (!at.startsWith('@media')) {
      other.push(at);
      continue;
    }
    const rest = at.replace(/\((min|max)-width:\s*(\d+)px\)/g, (m, kind, v) => {
      if (kind === 'min') lo = Math.max(lo, +v);
      else hi = Math.min(hi, +v);
      return '';
    });
    const tail = rest
      .replace(/^@media/, '')
      .replace(/\band\b/g, '')
      .trim();
    if (tail) other.push('@media ' + tail);
  }
  return { lo, hi, other, layer, media: ctx.some((a) => a.startsWith('@media')) };
}

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
