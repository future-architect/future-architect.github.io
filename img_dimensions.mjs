/**
 * 2021年以前の記事の <img> に実寸の width / height を補う (#2605)。
 *
 * 寸法の無い画像は読み込み時にレイアウトシフト（CLS）を起こす。2022年以降は
 * textlint の no-img-without-dimensions が止めているが、2021年以前は
 * 2,336箇所あって legacy-articles フィルタで対象外にしてある。
 *
 * 使い方（年単位。まず対応表を見て、納得してから --apply する）:
 *   node img_dimensions.mjs 2016          # 対応表を TSV で出すだけ
 *   node img_dimensions.mjs 2016 --apply  # 記事を書き換える
 *
 * 表示は変えない。CSS 側の `.blog-item img { max-width:100%; height:auto }` と
 * 表示調整クラス（img-small-size 等の `width: %`）が実際の見た目を持っており、
 * 属性はブラウザに縦横比を伝えるためだけに使われる。すでに整数の width が
 * 書かれているタグは、その値を残して高さを比率から出す（幅を実寸に戻すと
 * 表示が変わってしまう）。
 *
 * 判断が要るものは書き換えず「要判断」として報告する。パーセント指定
 * （`width=50%`。HTML の寸法属性はパーセントも解釈するので消すと表示が変わる）と、
 * 測れない画像（取り下げられた商品のアフィリエイト画像など）が該当する。
 */
import fs from 'node:fs';
import path from 'node:path';
import { imageSize } from 'image-size';

const POSTS = 'source/_posts';
const SOURCE = 'source';

// 外部画像は fetch しないと測れない。実行のたびに結果が変わるのを避けるため
// 実測値をここに持つ（curl で取得して計測。2026-08-18）
const EXTERNAL_SIZES = {
  'http://i.creativecommons.org/p/zero/1.0/88x31.png': [88, 31],
};

// タグの終わりを素朴に [^<>]* で探すと、引用符の中の > （alt="a -> b" 等）で
// タグを途中で切ってしまう。引用符で囲まれた値は丸ごと飛ばして > を探す
const IMG_RE = /<img\b((?:"[^"]*"|'[^']*'|[^<>"'])*)>/gi;
const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>]+))?/g;

/** フェンスのコードブロックとインラインコードの範囲。textlint 側の除外と揃える */
function codeRanges(text) {
  const ranges = [];
  let pos = 0;
  let fence = null;
  let start = 0;
  for (const line of text.split('\n')) {
    const s = line.trim();
    if (fence === null) {
      if (s.startsWith('```') || s.startsWith('~~~')) {
        fence = s.slice(0, 3);
        start = pos;
      }
    } else if (s.startsWith(fence)) {
      ranges.push([start, pos + line.length]);
      fence = null;
    }
    pos += line.length + 1;
  }
  if (fence !== null) ranges.push([start, text.length]);
  const inlineCode = /`[^`\n]+`/g;
  let hit;
  while ((hit = inlineCode.exec(text)) !== null) {
    ranges.push([hit.index, hit.index + hit[0].length]);
  }
  return ranges;
}

function parseAttrs(inner) {
  const attrs = new Map();
  ATTR_RE.lastIndex = 0;
  let m;
  while ((m = ATTR_RE.exec(inner)) !== null) {
    const name = m[1].toLowerCase();
    let value = m[2] ?? '';
    if (value.length >= 2 && (value[0] === '"' || value[0] === "'")) {
      value = value.slice(1, -1);
    }
    // 同名が重複しているときは HTML と同じく先勝ち
    if (!attrs.has(name)) attrs.set(name, { value, start: m.index, end: m.index + m[0].length });
  }
  return attrs;
}

/** ブラウザが表示に使う指定幅。`700px` は末尾を無視して 700 と読まれる */
function usedDimension(raw) {
  if (raw === undefined) return null;
  const m = /^\s*(\d+)\s*(%)?/.exec(raw);
  if (!m) return null;
  if (m[2]) return { percent: true };
  return { px: Number(m[1]) };
}

// src は日本語ファイル名で percent-encoding されていることがあるので戻す。ただし
// `Replication-8%.png` のように % がファイル名の一部で encoding として不正な場合も
// あり、decodeURI は例外を投げる。その場合は素のパスがそのままファイル名
function decodePath(src) {
  try {
    return decodeURI(src);
  } catch {
    return src;
  }
}

function measure(src) {
  if (EXTERNAL_SIZES[src]) {
    const [width, height] = EXTERNAL_SIZES[src];
    return { width, height, from: '外部（実測値を表に保持）' };
  }
  if (!src.startsWith('/')) return null;
  const file = path.join(SOURCE, decodePath(src.split('?')[0]).replace(/^\//, ''));
  if (!fs.existsSync(file)) return null;
  const { width, height } = imageSize(fs.readFileSync(file));
  if (!Number.isInteger(width) || !Number.isInteger(height)) return null;
  return { width, height, from: '実測' };
}

/** タグの中の width / height を、値の置き換えか loading の手前への挿入で直す */
function rewriteTag(tag, width, height) {
  const inner = tag.slice(4, -1);
  const attrs = parseAttrs(inner);
  let out = inner;
  const edits = [];

  for (const [name, value] of [
    ['width', width],
    ['height', height],
  ]) {
    const hit = attrs.get(name);
    if (hit) {
      edits.push({ start: hit.start, end: hit.end, text: `${name}="${value}"` });
    }
  }
  const missing = ['width', 'height'].filter((n) => !attrs.has(n));
  if (missing.length > 0) {
    const text = missing.map((n) => `${n}="${n === 'width' ? width : height}"`).join(' ');
    // 片方だけ既にあるなら隣に置く。離れた位置に入れると width と height が
    // 別の属性で分断されて読みにくい
    const width0 = attrs.get('width');
    const height0 = attrs.get('height');
    if (width0) {
      edits.push({ start: width0.end, end: width0.end, text: ` ${text}` });
    } else if (height0) {
      edits.push({ start: height0.start, end: height0.start, text: `${text} ` });
    } else {
      // CLAUDE.md の並び（src alt width height loading）に寄せる。loading が無ければ末尾
      const anchor = attrs.get('loading');
      const at = anchor ? anchor.start : inner.replace(/\s+$/, '').length;
      edits.push({ start: at, end: at, text: anchor ? `${text} ` : ` ${text}` });
    }
  }

  edits.sort((a, b) => b.start - a.start);
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return `<img${out}>`;
}

const year = process.argv[2];
const apply = process.argv.includes('--apply');
if (!/^\d{4}$/.test(year ?? '')) {
  console.error('usage: node img_dimensions.mjs <year> [--apply]');
  process.exit(1);
}

const dir = path.join(POSTS, year);
const rows = [];
const pending = [];
let changedFiles = 0;

for (const name of fs.readdirSync(dir).sort()) {
  if (!name.endsWith('.md')) continue;
  const file = path.join(dir, name);
  const text = fs.readFileSync(file, 'utf8');
  const ranges = codeRanges(text);
  const replacements = [];

  IMG_RE.lastIndex = 0;
  let m;
  while ((m = IMG_RE.exec(text)) !== null) {
    const at = m.index;
    if (ranges.some(([a, b]) => at >= a && at < b)) continue;

    const attrs = parseAttrs(m[1]);
    const w = attrs.get('width')?.value;
    const h = attrs.get('height')?.value;
    if (/^\d+$/.test(w ?? '') && /^\d+$/.test(h ?? '')) continue;

    const line = text.slice(0, at).split('\n').length;
    const src = attrs.get('src')?.value ?? '';
    const size = measure(src);
    if (!size) {
      pending.push({ file: name, line, src, why: '測れない（外部 / ファイルが無い）' });
      continue;
    }

    const uw = usedDimension(w);
    const uh = usedDimension(h);
    if (uw?.percent || uh?.percent) {
      pending.push({ file: name, line, src, why: 'パーセント指定。整数にすると表示が変わる' });
      continue;
    }

    // 表示に効いている指定があればそれを残し、もう一方を実寸の比率から出す
    let width = size.width;
    let height = size.height;
    let basis = size.from;
    if (uw?.px) {
      width = uw.px;
      height = Math.round((size.height * uw.px) / size.width);
      basis = `${size.from}（幅 ${uw.px} を維持し比率から高さを算出）`;
    } else if (uh?.px) {
      height = uh.px;
      width = Math.round((size.width * uh.px) / size.height);
      basis = `${size.from}（高さ ${uh.px} を維持し比率から幅を算出）`;
    }

    const after = rewriteTag(m[0], width, height);
    replacements.push({ start: at, end: at + m[0].length, after });
    rows.push({
      file: name,
      line,
      src,
      intrinsic: `${size.width}x${size.height}`,
      width,
      height,
      basis,
    });
  }

  if (apply && replacements.length > 0) {
    let out = text;
    for (const r of replacements.reverse())
      out = out.slice(0, r.start) + r.after + out.slice(r.end);
    fs.writeFileSync(file, out);
    changedFiles += 1;
  }
}

console.log(['ファイル', '行', 'src', '実寸', 'width', 'height', '根拠'].join('\t'));
for (const r of rows) {
  console.log([r.file, r.line, r.src, r.intrinsic, r.width, r.height, r.basis].join('\t'));
}
console.error(`\n${year}年: 直した ${rows.length}箇所 / 要判断 ${pending.length}箇所`);
for (const p of pending) console.error(`  要判断 ${p.file}:${p.line} ${p.src} — ${p.why}`);
if (apply) console.error(`書き換えたファイル: ${changedFiles}`);
