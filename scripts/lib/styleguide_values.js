'use strict';

/**
 * スタイルガイド（/specials/styleguide/）の見本に値を書き込む (#3340)。
 *
 * 値は CSS の :root が配るトークンから読む。ページにもここにも値を書き写さない
 * （#2768「一致していることを主張しない」）。トークンが light-dark() で
 * 両方の値を持つものは、表がどちらの側の段かで片方を取る。
 */

/** :root の宣言を { '--name': 値 } にする。値は書かれた文字列のまま */
function readRootTokens(css) {
  const tokens = {};
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const block of css.matchAll(/(?:^|\})\s*:root\s*\{([^}]*)\}/g)) {
    for (const m of block[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      tokens[m[1]] = m[2].trim();
    }
  }
  return tokens;
}

/** light-dark(L, D) を [L, D] に。括弧の中のカンマ（rgba）では切らない */
function splitLightDark(value) {
  const m = value.match(/^light-dark\((.*)\)$/);
  if (!m) return [value, value];
  let depth = 0;
  for (let i = 0; i < m[1].length; i++) {
    const c = m[1][i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ',' && depth === 0) return [m[1].slice(0, i).trim(), m[1].slice(i + 1).trim()];
  }
  throw new Error(`light-dark の形ではない: ${value}`);
}

function luminosity(color) {
  let hex = color.replace('#', '');
  if (hex.length === 3) hex = [...hex].map((c) => c + c).join('');
  const ch = (i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c < 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(0) + 0.7152 * ch(2) + 0.0722 * ch(4);
}

/** WCAG のコントラスト比。小数2桁で丸める */
function contrast(fg, bg) {
  const a = luminosity(fg) + 0.05;
  const b = luminosity(bg) + 0.05;
  return Math.round((Math.max(a, b) / Math.min(a, b)) * 100) / 100;
}

const L = (name) => ({ name, side: 0 });
const D = (name) => ({ name, side: 1 });
const NOTES = ['tip', 'info', 'warn', 'alert'];

/**
 * 見本の行。class の `sg-<key>` が key に当たる。token はどのトークンのどちらの側か、
 * grounds は比を測る地（複数なら最小を出す。AA を満たすかはいちばん厳しい地で決まる）。
 * grounds が無いもの（半透明の rule-on-dark）は比を出さない
 */
function rows() {
  const out = {};
  const add = (keys, token, grounds) =>
    keys.forEach((k) => (out[k] = { token: token(k), grounds }));
  const same = (side) => (k) => ({ name: '--' + k, side });
  const dark = (k) => ({ name: '--' + k.replace(/^dark-/, ''), side: 1 });

  add(
    [
      'ink-strong',
      'ink-mute',
      'ink-faint',
      'rule-base',
      'rule-weak',
      'rule-strong',
      'surface-tint',
      'surface-mute',
      'brand-navy',
      'brand-gray',
      'brand-crimson',
    ],
    same(0),
    ['#fff'],
  );
  add(['on-dark-strong', 'on-dark', 'on-dark-mute', 'navy-raised', 'crimson-on-dark'], same(0), [
    L('--brand-navy'),
  ]);
  add(['rule-on-dark'], same(0), null);
  add(['link-blue', 'link-visited'], same(0), ['#fff']);
  // リンクの中のインラインコードの色。明るい側は link-on-tint を持つ (#3244)
  add(['link-on-tint'], () => L('--code-in-link'), [L('--surface-mute')]);
  // 明るい側の note の中のリンクは、note の地と中のコードの札の両方で測る (#3241)
  for (const n of NOTES) {
    add([`link-on-note-${n}`], same(0), [L(`--note-${n}-bg`), L(`--note-${n}-code`)]);
  }
  add(['link-on-note-visited'], same(0), [
    ...NOTES.map((n) => L(`--note-${n}-bg`)),
    ...NOTES.map((n) => L(`--note-${n}-code`)),
  ]);

  const codeRoles = ['fg', 'comment', 'keyword', 'type', 'string', 'number', 'attr', 'tag'];
  add(
    codeRoles.map((r) => `code-${r}`),
    same(0),
    [L('--code-block-bg'), ...NOTES.map((n) => L(`--note-${n}-codeblock`))],
  );
  add(
    codeRoles.map((r) => `dark-code-${r}`),
    dark,
    [D('--code-block-bg')],
  );

  add(['scrollbar-thumb'], same(0), [L('--code-block-bg'), L('--surface-base')]);
  add(['dark-scrollbar-thumb'], dark, [D('--code-block-bg'), D('--surface-base')]);

  // 暗い側の比の地はページの地 (#3012)
  add(
    [
      'dark-ink-strong',
      'dark-ink-mute',
      'dark-ink-faint',
      'dark-rule-base',
      'dark-rule-weak',
      'dark-rule-strong',
      'dark-surface-base',
      'dark-surface-tint',
      'dark-surface-mute',
      'dark-link-blue',
      'dark-link-visited',
      ...NOTES.map((n) => `dark-note-${n}-bg`),
      'dark-award-card-from',
      'dark-award-card-to',
      'dark-award-card-rule',
      'dark-award-gold-on-tint',
      'dark-award-bronze',
      'dark-award-silver',
    ],
    dark,
    [D('--surface-base')],
  );
  add(['dark-navy'], () => D('--brand-navy'), [D('--surface-base')]);
  // 暗い側の note の中のリンクは note の地だけで測る (#3244)
  for (const n of NOTES) add([`dark-link-on-note-${n}`], dark, [D(`--note-${n}-bg`)]);
  add(
    ['dark-link-on-note-visited'],
    dark,
    NOTES.map((n) => D(`--note-${n}-bg`)),
  );
  return out;
}

const SPACE_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12];

/** スタイルガイドの HTML に、見本の地・16進数・比・段の値を書き込む */
function fillStyleguide(html, css) {
  const tokens = readRootTokens(css);
  const pick = ({ name, side }) => {
    if (!(name in tokens)) throw new Error(`スタイルガイド: ${name} が :root に無い`);
    return splitLightDark(tokens[name])[side];
  };
  const color = (g) => (typeof g === 'string' ? g : pick(g));
  const table = rows();
  const row = (key) => {
    if (!table[key]) throw new Error(`スタイルガイド: sg-${key} の段が分からない`);
    return table[key];
  };

  html = html.replace(
    /<span class="sg-chip sg-([a-z0-9-]+)"><\/span>/g,
    (m, key) =>
      `<span class="sg-chip sg-${key}" style="background: ${pick(row(key).token)}"></span>`,
  );
  html = html.replace(
    /<span class="sg-hex sg-([a-z0-9-]+)"><\/span>/g,
    (m, key) => `<span class="sg-hex sg-${key}">${pick(row(key).token)}</span>`,
  );
  html = html.replace(/<span class="sg-ratio sg-([a-z0-9-]+)"><\/span>/g, (m, key) => {
    const { token, grounds } = row(key);
    const ratio = Math.min(...grounds.map((g) => contrast(pick(token), color(g))));
    return `<span class="sg-ratio sg-${key}">${ratio}</span>`;
  });

  // 文字の大きさと行間の段。見本は実物と同じトークンで組む
  html = html.replace(
    /(<div class="sg-(size|leading) sg-\2-([a-z]+)">[\s\S]*?)<span class="sg-\2-value"><\/span>([\s\S]*?)<div class="sg-\2-(sample|lines)">/g,
    (m, head, kind, step, mid, box) => {
      const name = kind === 'size' ? `--text-${step}` : `--leading-${step}`;
      const prop = kind === 'size' ? 'font-size' : 'line-height';
      return (
        `${head}<span class="sg-${kind}-value">${pick(L(name))}</span>${mid}` +
        `<div class="sg-${kind}-${box}" style="${prop}: var(${name})">`
      );
    },
  );
  // 間隔の段。刻みに倍数を掛ける
  const step = parseFloat(pick(L('--space-step')));
  html = html.replace(
    /<div class="sg-space-item sg-space-(\d+)"><span class="sg-space-bar"><\/span><span class="sg-space-value"><\/span><\/div>/g,
    (m, n) => {
      if (!SPACE_STEPS.includes(+n)) throw new Error(`スタイルガイド: sg-space-${n} は段に無い`);
      return (
        `<div class="sg-space-item sg-space-${n}"><span class="sg-space-bar" style="width: calc(var(--space-step) * ${n})"></span>` +
        `<span class="sg-space-value">${step * n}px</span></div>`
      );
    },
  );
  html = html.replace(
    /<span class="sg-underline-offset"><\/span>/g,
    `<span class="sg-underline-offset">${pick(L('--link-underline-offset'))}</span>`,
  );
  return html;
}

module.exports = { readRootTokens, splitLightDark, contrast, fillStyleguide };
