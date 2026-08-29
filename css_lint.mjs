// コンパイル後の CSS に、解決されなかった Stylus の識別子が残っていないかを見る。
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
