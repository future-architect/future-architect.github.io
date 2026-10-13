// 連結後の CSS（public/css/site.css） を見て、「画面を見るまで気づけない壊れ方」を3つ止める。
// どれも書いた宣言が無言で捨てられる形で、ビルドもエラーにならない。
//
// 1. 定義の無いカスタムプロパティの参照（以下）
// 2. ベンダー接頭辞の擬似要素と他のセレクタの同居
// 3. 括弧の閉じていないセレクタ
//
// var() の参照先がどこにも定義されていないと、その宣言は無効になって
// 初期値に落ちる。トークンの名前の打ち間違いや、tokens.css から消した
// トークンの使い残しがこの形になる。Stylus の頃は未定義の変数が名前のまま
// 出力されて同じ壊れ方をしていた（#2746 で表の枠が全ページで消えた）。
// 代わりの値（var(--x, 3ch)）を持つ参照と、Bootstrap の --bs-* は見ない
import { readFileSync } from 'node:fs';

const FILE = 'public/css/site.css';

const css = readFileSync(FILE, 'utf8');
const defined = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
const undefinedRefs = [
  ...new Set(
    [...css.matchAll(/var\((--[\w-]+)\s*\)/g)]
      .map((m) => m[1])
      .filter((name) => !name.startsWith('--bs-') && !defined.has(name)),
  ),
];

if (undefinedRefs.length) {
  console.error(`定義の無いカスタムプロパティの参照が ${undefinedRefs.length} 件あります。\n`);
  undefinedRefs.forEach((name) => console.error(`  ${FILE}  var(${name})`));
  console.error('\nトークンは themes/future/css-src/tokens.css が持ちます。');
  process.exit(1);
}
console.log('定義の無いカスタムプロパティの参照はありません');

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
// セレクタがあるとルールごと捨てられる」形。Stylus の頃は `:has()` の中のカンマを
// セレクタの区切りとして扱われて、この形が作られていた (#3164)。いまは手で書いた
// 閉じ忘れを拾う
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
  process.exit(1);
}
console.log('括弧の閉じていないセレクタはありません');
