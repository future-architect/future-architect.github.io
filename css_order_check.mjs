// 生成したページで、CSS の勝ち負けが書き順だけで決まっている組を数え、許可リストから増えたら知らせる (#3359)。
//
// 対象は「同じ詳細度・同じプロパティに違う値・同時に当たる条件」の2つの規則が、
// 代表的なページで実際に同じ要素に当たっている組。後ろに書いた方が勝つので、
// 並びが変わったり同じ要素に別のクラスが付いたりすると、黙って結果が変わる。
//
// 数えないもの:
// - 素の規則を後ろの @media が上書きする形（幅で値を変える正しい書き方。逆順は
//   css_media_order_lint.mjs が止める）
// - 許可リスト（css_order_allowlist.txt）に載せた組。リンクの状態の順番のように、
//   書き順で決めるのが定石のもの
//
// HTML が要るので PR では回さず、main のデプロイで生成した後に回して警告を出す。
// 手元では hexo generate の後に `node css_order_check.mjs`
import { existsSync, readFileSync, appendFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  parseRules,
  condition,
  contains,
  covers,
  specificity,
  compare,
} = require('./scripts/lib/css_rules.js');
const cheerio = require('cheerio');

const PAGES = [
  '/',
  '/page/3/',
  '/articles/20260417a/',
  '/articles/20260604a/',
  '/articles/20260122a/',
  '/articles/20260729a/',
  '/articles/20260827b/',
  '/articles/20210909a/',
  '/articles/2026/',
  '/articles/2026/03/',
  '/categories/',
  '/categories/Programming/',
  '/categories/Programming/page/2/',
  '/categories/Programming/without-go/',
  '/categories/Frontend/',
  '/tags/',
  '/tags/Go/',
  '/authors/',
  '/series/',
  '/specials/',
  '/specials/styleguide/',
  '/specials/gallery/',
  '/specials/markdown/',
  '/specials/publications/',
  '/specials/guidelines/',
  '/specials/techcast/',
  '/specials/httf/',
  '/specials/engineers/',
  '/specials/advent-calendar/',
  '/doctor/',
  '/404.html',
];
const ALLOWLIST = 'css_order_allowlist.txt';

const rules = parseRules(readFileSync('public/css/site.css', 'utf8'));
rules.forEach((r) => (r.cond = condition(r.ctx)));

// Bootstrap の層の中の並びは vendor のもので、こちらでは直さない
const overlaps = (a, b) =>
  a.layer === b.layer &&
  !a.layer.includes('bootstrap') &&
  Math.max(a.lo, b.lo) <= Math.min(a.hi, b.hi);
// 状態と疑似要素を外した、HTML に対して引けるセレクタ
const DYN =
  /:(hover|focus|focus-visible|focus-within|active|visited|link|any-link|checked|target|placeholder-shown)(?![\w-])/g;
const pseudoElement = (s) => (s.match(/::[\w-]+|:(before|after)(?![\w-])/) || [''])[0];
function staticSel(s) {
  let t = s.replace(/::[\w-]+(\([^)]*\))?/g, '').replace(/:(before|after)(?![\w-])/g, '');
  t = t.replace(/:not\(((?:[^()]|\([^()]*\))*)\)/g, (m, a) =>
    new RegExp(DYN.source).test(a) ? '' : m,
  );
  return t.replace(DYN, '').trim() || '*';
}

// HTML を見ずに絞った候補
const candidates = [];
for (let i = 0; i < rules.length; i++) {
  const a = rules[i];
  for (let j = i + 1; j < rules.length; j++) {
    const b = rules[j];
    if (!overlaps(a.cond, b.cond)) continue;
    // 後ろの @media / @container が素の規則を上書きする形は、条件で値を変える書き方そのもの
    if (contains(a.cond, b.cond) && !contains(b.cond, a.cond)) continue;
    const props = new Set();
    for (const x of a.decls)
      for (const y of b.decls)
        if (
          (covers(x.prop, y.prop) || covers(y.prop, x.prop)) &&
          x.value !== y.value &&
          !x.important &&
          !y.important
        )
          props.add(y.prop);
    if (!props.size) continue;
    for (const x of a.sels)
      for (const y of b.sels) {
        if (pseudoElement(x) !== pseudoElement(y)) continue;
        if (compare(specificity(x), specificity(y)) !== 0) continue;
        candidates.push({
          x,
          y,
          sx: staticSel(x),
          sy: staticSel(y),
          props: [...props].sort().join(','),
        });
      }
  }
}

const found = new Map();
let checked = 0;
for (const page of PAGES) {
  const file = 'public' + (page.endsWith('/') ? page + 'index.html' : page);
  if (!existsSync(file)) continue;
  checked++;
  const $ = cheerio.load(readFileSync(file, 'utf8'));
  const cache = new Map();
  const select = (s) => {
    if (!cache.has(s)) {
      try {
        cache.set(s, new Set($(s).toArray()));
      } catch {
        cache.set(s, new Set());
      }
    }
    return cache.get(s);
  };
  for (const c of candidates) {
    const key = `${c.x} <= ${c.y} { ${c.props} }`;
    if (found.has(key)) continue;
    const A = select(c.sx);
    if (!A.size) continue;
    for (const el of select(c.sy))
      if (A.has(el)) {
        found.set(key, page);
        break;
      }
  }
}

const allowed = new Set(
  existsSync(ALLOWLIST)
    ? readFileSync(ALLOWLIST, 'utf8')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'))
    : [],
);
const added = [...found].filter(([key]) => !allowed.has(key));
const gone = [...allowed].filter((key) => !found.has(key));

if (process.argv.includes('--print')) {
  [...found.keys()].sort().forEach((k) => console.log(k));
  process.exit(0);
}
console.log(
  `書き順で勝ち負けが決まっている組 ${found.size}（許可リスト ${allowed.size}、ページ ${checked}/${PAGES.length}）`,
);
if (gone.length) {
  console.log(`\n許可リストにあって、もう見つからない組 ${gone.length}（リストから外してよい）`);
  gone.forEach((k) => console.log(`  ${k}`));
}
if (added.length) {
  const lines = added.map(([k, page]) => `  ${k}  （${page}）`);
  console.log(`\n新しく書き順に頼るようになった組 ${added.length}`);
  lines.forEach((l) => console.log(l));
  console.log(
    '\n上書きする側を元のクラスと組み合わせるか、既定の側を :where() で下げてください（CLAUDE.md）。',
  );
  // デプロイは止めない。Actions の画面に警告として出す
  if (process.env.GITHUB_ACTIONS) {
    added.forEach(([k]) => console.log(`::warning title=CSS の書き順::${k}`));
    if (process.env.GITHUB_STEP_SUMMARY)
      appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        `### 新しく書き順に頼るようになった CSS の組\n\n${added.map(([k, p]) => `- \`${k}\`（${p}）`).join('\n')}\n`,
      );
  }
}
