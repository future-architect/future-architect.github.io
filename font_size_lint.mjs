// 文字サイズが段（_variables.styl の text-*）から外れていないかを検査する (#2971)。
//
// 26種類に散っていた font-size を7段に寄せたが、寄せ終えた直後に別の PR が
// 1.4em と 12px を直接書いて段の外へ戻った。文章の決まりだけでは守れないので、
// 機械で止める。行間（leading-*）と間隔（space-step）は変数を使うのが自然な形に
// なっているが、font-size は px / em をそのまま書けてしまう。
//
// 段の外に置くものは、ここに理由付きで1件ずつ挙げる。「なんとなく実在する値を
// 選んだ」を通さないための一覧なので、増やすときは理由を書く。
import { readFileSync } from 'node:fs';

const FILE = 'themes/future/css-src/theme-styles.styl';

// _variables.styl が持つ段
const STEPS = [
  'text-meta',
  'text-base',
  'text-row',
  'text-body',
  'text-lead',
  'text-title',
  'text-display',
];

// 親の倍率を打ち消す指定。サイズを決めていないので段の話ではない
const CANCEL = ['1em', '1.0em', 'inherit', 'inherit !important'];

// 段の外に置くもの。キーはセレクタ（複数行のセレクタは先頭行）
const EXEMPT = new Map([
  // 本文見出しの梯子。比が階層を作る列で、土台の大きさに追従する (#2524 / #2599)
  ['.article-entry h2', '1.85em'],
  ['.article-entry h3', '1.5em'],
  ['.article-entry h4', '1.3em'],
  ['.article-entry h5', '1.2em'],
  ['.article-entry h6', '1.1em'],
  // 記事タイトル・ページ見出し。幅で変える唯一の値
  ['.article-title', "unquote('clamp(26px, 1.325rem + 0.9vw, 32px)')"],
  // font-size がアイコンの実寸を決めている箇所（.svg-icon が 1em）。文字ではない
  ['.snscount-icon', '1.15em'],
  ['.header-theme', '20px'],
  ['.header-search-open', '20px'],
  ['.header-search:focus-within .header-search-close', '20px'],
  // 機能で決まる値。16px を下回ると iOS がフォーカス時に画面をズームする
  ['.header-search input', '16px'],
  ['.header-search button', '16px'],
  // 一点もの
  ['.page-404 .number', '128px'],
  ['.blog-tags li a span', '0.5em'],
  // 行き先の名前に付く総数。行の主題は名前で、数字は選ぶ判断には効かない。
  // 段のいちばん下（text-meta 12px）でも 13px の名前と 1px しか違わず、
  // 名前の一部に見える。同じ役のタグのチップの件数（0.5em）に寄せた
  ['.header-dropdown-count', '8px'],
  ['.article-entry .highlight .gutter pre', '0.95em'],
]);

const lines = readFileSync(FILE, 'utf8').split('\n');
const errors = [];
// メディアクエリの中にもルールが入るので、開いた塊を積んで内側から見る。
// 積まないと @media (max-width: 575px) がセレクタとして残る
const stack = [];
let pending = [];
const selectorOf = () => [...stack].reverse().find((s) => !s.startsWith('@')) || '';

lines.forEach((line, i) => {
  const open = line.match(/^\s*(\S.*?)\s*\{\s*$/);
  if (open) {
    stack.push([...pending, open[1]][0]);
    pending = [];
    return;
  }
  if (/^\s*\}\s*$/.test(line)) {
    stack.pop();
    return;
  }
  // 複数行のセレクタ（末尾がカンマ）。先頭行を代表にする
  const cont = line.match(/^\s*(\S.*?),\s*$/);
  if (cont && !cont[1].includes(':')) {
    pending.push(cont[1]);
    return;
  }
  const decl = line.match(/^\s*font-size:\s*([^;]+);\s*$/);
  if (!decl) return;
  const value = decl[1].trim();
  if (STEPS.includes(value) || CANCEL.includes(value)) return;
  if (EXEMPT.get(selectorOf()) === value) return;
  errors.push(`${FILE}:${i + 1}  ${selectorOf()} { font-size: ${value} }`);
});

if (errors.length) {
  console.error(`段の外の font-size が ${errors.length} 件あります。\n`);
  errors.forEach((e) => console.error(`  ${e}`));
  console.error(`\n段は ${STEPS.join(' / ')}（_variables.styl）。`);
  console.error(
    '段の外に置く理由があるなら font_size_lint.mjs の EXEMPT に理由付きで足してください。',
  );
  process.exit(1);
}
console.log(`font-size は段に収まっています（段の外は EXEMPT の ${EXEMPT.size} 件だけ）`);
