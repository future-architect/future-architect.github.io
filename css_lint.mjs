// コンパイル後の CSS を見て、「画面を見るまで気づけない壊れ方」を2つ止める。
// どちらも書いた宣言が無言で捨てられる形で、ビルドもエラーにならない。
//
// 1. 解決されなかった Stylus の識別子（以下）
// 2. ベンダー接頭辞の擬似要素と他のセレクタの同居（ファイル後半）
//
// Stylus は未定義の変数をエラーにせず、**名前をそのまま値として出力する**。
// CSS 側では無効な値なので、その宣言（一括指定なら丸ごと）が捨てられる。
// 画面を見るまで気づけない壊れ方で、実際に踏んだ:
//
//   :root { --table-border: table-border }   ← 解決されず、表の枠が全部消えた (#2746)
//   .footer-link { transition: hover-speed }  ← 同じ形 (#2753)
//
// 原因はいつも同じで、**変数の定義が使う場所より後ろにある**こと。
// _variables.styl は theme-styles.styl の先頭で読むので、そこに置けば起きない。
import { readFileSync } from 'node:fs';

const FILE = 'public/css/site.css';

// 値として正当なキーワード。ここに無い裸の識別子は解決漏れとみなす
const KEYWORDS = new Set([
  'inherit',
  'initial',
  'unset',
  'revert',
  'none',
  'auto',
  'transparent',
  'currentColor',
  'solid',
  'dashed',
  'dotted',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
  'hidden',
]);

const css = readFileSync(FILE, 'utf8');
const errors = [];
for (const m of css.matchAll(/(--[\w-]+):\s*([^;{}]+);/g)) {
  const value = m[2].trim();
  // 裸の識別子だけの値（#hex・数値・var()・関数・キーワードのどれでもない）
  if (!/^[a-zA-Z][\w-]*$/.test(value)) continue;
  if (KEYWORDS.has(value)) continue;
  errors.push(`${m[1]}: ${value}`);
}

if (errors.length) {
  console.error(`解決されなかった Stylus の識別子が ${errors.length} 件あります。\n`);
  errors.forEach((e) => console.error(`  ${FILE}  ${e}`));
  console.error('\n変数の定義が、使う場所より後ろにあります。');
  console.error('_variables.styl へ移してください（theme-styles.styl の先頭で読まれます）。');
  process.exit(1);
}
console.log('CSS に解決漏れの識別子はありません');

// ベンダー接頭辞の擬似要素が、他のセレクタと同じセレクタリストに入っていないかを見る。
//
// セレクタリストに1つでも解釈できないセレクタがあると、ブラウザは**ルールごと捨てる**。
// ::-moz-selection は Firefox 専用なので、他のセレクタと並べると Chrome / Safari で
// その塊が丸ごと効かなくなる。これも画面を見るまで気づけない壊れ方で、実際に踏んだ:
//
//   :root[data-theme='dark'] ::-moz-selection, ... , .post-list-rank-high { ... }
//     ← ダークモードで選択の地・スキップリンク・ランキングの丸が明るい側の値のまま (#3058)
//
// 同じ接頭辞だけで組んだリスト（bootstrap の ::-webkit-datetime-edit-* など）は、
// 効かないブラウザでは全部まとめて要らないので対象外にする。
const VENDOR_PSEUDO = /::-(?:moz|webkit|ms|o)-/;

const mixed = [];
// `}` か `{` の直後から次の `{` までがセレクタ。`@media` などの前置きは `@` で外す
for (const m of css.matchAll(/[}{]([^{}@;]+)\{/g)) {
  const parts = m[1].split(',').map((s) => s.trim().replace(/\s+/g, ' '));
  if (parts.length < 2) continue;
  const vendor = parts.filter((s) => VENDOR_PSEUDO.test(s));
  if (vendor.length === 0 || vendor.length === parts.length) continue;
  mixed.push({ vendor, all: parts });
}

if (mixed.length) {
  console.error(
    `\nベンダー接頭辞の擬似要素が他のセレクタと同居しているルールが ${mixed.length} 件あります。\n`,
  );
  mixed.forEach(({ vendor, all }) => {
    console.error(`  ${FILE}  ${vendor.join(', ')}`);
    console.error(
      `    同居しているセレクタ: ${all.filter((s) => !VENDOR_PSEUDO.test(s)).join(', ')}`,
    );
  });
  console.error('\nそのルールは、接頭辞を知らないブラウザでは丸ごと捨てられます。');
  console.error('ベンダー接頭辞の擬似要素は単独のルールに分けてください。');
  process.exit(1);
}
console.log('ベンダー接頭辞の擬似要素の同居はありません');

// セレクタの括弧が閉じているかを見る。上と同じ「リストに1本でも解釈できない
// セレクタがあるとルールごと捨てられる」形で、こちらは Stylus が作る。
//
// **Stylus は `:has()` / `:is()` の中のカンマもセレクタの区切りとして扱う。**
// 複数のセレクタを並べると2本目以降が引数の途中から始まり、入れ子にすると
// 子セレクタが引数ひとつずつに配られる。どちらも閉じ括弧の余ったセレクタが混ざる:
//
//   .card:hover:has(.a:hover, .b:hover) .title, .card:hover:has(.a:hover, .b:hover) .meta
//     → `.card:hover:has(.a:hover,` … `.b:hover) .meta`  ← 後半が壊れてルールごと消える
//
// カンマを持つ `:has()` は @css で素の CSS として通す (#3164)。
const unbalanced = [];
for (const m of css.matchAll(/[}{]([^{}@;]+)\{/g)) {
  // カンマで割るのは括弧の外だけ。`:has(a, b)` の中のカンマは区切りではない
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < m[1].length; i++) {
    const c = m[1][i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ',' && depth === 0) {
      parts.push(m[1].slice(start, i));
      start = i + 1;
    }
  }
  parts.push(m[1].slice(start));
  for (const part of parts) {
    let d = 0;
    for (const c of part) {
      if (c === '(') d++;
      else if (c === ')') d--;
      if (d < 0) break;
    }
    if (d !== 0) unbalanced.push(part.trim().replace(/\s+/g, ' '));
  }
}

if (unbalanced.length) {
  console.error(`\n括弧の閉じていないセレクタが ${unbalanced.length} 件あります。\n`);
  unbalanced.forEach((s) => console.error(`  ${FILE}  ${s}`));
  console.error('\nそのセレクタを含むルールは、ブラウザに丸ごと捨てられます。');
  console.error('カンマを持つ :has() / :is() は @css で素の CSS として通してください。');
  process.exit(1);
}
console.log('括弧の閉じていないセレクタはありません');
