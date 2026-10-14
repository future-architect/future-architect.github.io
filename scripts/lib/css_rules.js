'use strict';

/**
 * 連結後の site.css を、ネストを解いた規則の列に並べ直す (#3359)。
 * css_media_order_lint.mjs と css_order_check.mjs が使う。
 * Hexo の処理には関わらない（scripts/lib に置くのは site_css.js と同じ流儀）。
 */

// 一括指定は、その名前で始まる個別指定も上書きする（margin は margin-top を消す）。
// 名前の前方一致で決まらないものは IRREGULAR が持つ
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
  'border-color',
  'border-width',
  'border-style',
  'border-radius',
  'background',
  'font',
  'transition',
  'animation',
  'overflow',
  'outline',
  'list-style',
  'text-decoration',
  'margin-block',
  'margin-inline',
  'padding-block',
  'padding-inline',
]);
const IRREGULAR = {
  // border は border-radius を戻さない
  border: (p) => p.startsWith('border-') && !p.startsWith('border-radius') && !/-radius$/.test(p),
  flex: (p) => ['flex-grow', 'flex-shrink', 'flex-basis'].includes(p),
  'flex-flow': (p) => ['flex-direction', 'flex-wrap'].includes(p),
  gap: (p) => ['row-gap', 'column-gap'].includes(p),
  inset: (p) => ['top', 'right', 'bottom', 'left'].includes(p),
  'place-items': (p) => ['align-items', 'justify-items'].includes(p),
  'place-content': (p) => ['align-content', 'justify-content'].includes(p),
  'place-self': (p) => ['align-self', 'justify-self'].includes(p),
  columns: (p) => ['column-width', 'column-count'].includes(p),
  grid: (p) => /^grid-(template|auto)-/.test(p),
};
const covers = (later, earlier) =>
  later === earlier ||
  (IRREGULAR[later]
    ? IRREGULAR[later](earlier)
    : SHORTHANDS.has(later) && earlier.startsWith(later + '-'));

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
function parseRules(text) {
  text = text.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  const stack = [{ sels: null, ctx: [] }];
  let buf = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '{') {
      const prelude = buf.trim();
      buf = '';
      const top = stack[stack.length - 1];
      if (prelude.startsWith('@')) stack.push({ sels: top.sels, ctx: [...top.ctx, prelude] });
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
            value: decl.slice(k + 1).trim(),
            important: /!important\s*$/.test(decl),
          });
      }
      if (c === '}') stack.pop();
    } else buf += c;
  }
  rules.forEach((r, i) => (r.index = i));
  return rules;
}

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

// a の条件が b の条件をすべて含む（a が当たるときは必ず b も当たる、の逆）
const contains = (a, b) =>
  a.layer === b.layer && a.lo <= b.lo && a.hi >= b.hi && a.other.every((o) => b.other.includes(o));

// 詳細度。:where() は 0、:is() / :not() / :has() は引数の最大
function specificity(sel) {
  let a = 0;
  let b = 0;
  let c = 0;
  let s = sel.replace(/:where\((?:[^()]|\([^()]*\))*\)/g, '');
  s = s.replace(/:(is|not|has)\(((?:[^()]|\([^()]*\))*)\)/g, (m, f, args) => {
    const best = splitList(args).map(specificity).sort(compare).pop() || [0, 0, 0];
    a += best[0];
    b += best[1];
    c += best[2];
    return '';
  });
  s = s.replace(/::[\w-]+(\([^)]*\))?/g, () => {
    c++;
    return '';
  });
  s = s.replace(/:(before|after)(?![\w-])/g, () => {
    c++;
    return '';
  });
  s = s.replace(/\[[^\]]*\]/g, () => {
    b++;
    return '';
  });
  s = s.replace(/#[\w-]+/g, () => {
    a++;
    return '';
  });
  s = s.replace(/\.[\w-]+/g, () => {
    b++;
    return '';
  });
  s = s.replace(/:[\w-]+(\([^)]*\))?/g, () => {
    b++;
    return '';
  });
  for (const t of s.split(/[\s>+~]+/)) if (/^[a-zA-Z][\w-]*$/.test(t)) c++;
  return [a, b, c];
}
function compare(x, y) {
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
}

module.exports = { parseRules, condition, contains, covers, splitList, specificity, compare };
