// source/_data/tag_ontology.yml の整合性チェック (#2292)
//
// エラー（exit 1）: broader / versionOf 先の未登録、循環
// 情報: 使われていないノード、高頻度なのに未登録のタグ、統合候補（ほぼ重複）、
//       バージョン同義の導出結果（scripts/version_tags.js と同じ規則。誤爆の目視確認用）
//
// 実行: node .claude/skills/tag-maintenance/check.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const yaml = createRequire(path.join(root, 'package.json'))('js-yaml');

// 10記事以上のタグはオントロジーへの登録を求める（骨格の維持ライン）
const REGISTER_THRESHOLD = 10;

const ontology = yaml.load(fs.readFileSync(path.join(root, 'source/_data/tag_ontology.yml'), 'utf8')) || {};

// ---- 記事のタグを集める ----
const tagPosts = new Map(); // タグ名 -> 記事ファイルの配列
const postsDir = path.join(root, 'source/_posts');
for (const year of fs.readdirSync(postsDir)) {
  const dir = path.join(postsDir, year);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    const fm = fs.readFileSync(path.join(dir, file), 'utf8').split(/^---\s*$/m)[1] || '';
    const m = fm.match(/^tags:[ \t]*\n((?:[ \t]*-[^\n]*\n)*)/m);
    if (!m) continue;
    for (const line of m[1].split('\n')) {
      const t = line.replace(/^[ \t]*-[ \t]*/, '').replace(/^["']|["']$/g, '').trim();
      if (!t) continue;
      if (!tagPosts.has(t)) tagPosts.set(t, []);
      tagPosts.get(t).push(`${year}/${file}`);
    }
  }
}

const errors = [];
const infos = [];

// ---- 1) broader / versionOf 先が未登録 ----
for (const [name, node] of Object.entries(ontology)) {
  if (node && typeof node.versionOf === 'string') {
    // versionOf ノードは同義先に吸収されるので broader を持たない
    if (!(node.versionOf in ontology)) errors.push(`${name}: versionOf 先「${node.versionOf}」が未登録`);
    continue;
  }
  const broader = node && node.broader;
  if (!Array.isArray(broader)) {
    errors.push(`${name}: broader が配列でない（根タグは broader: [] と書く）`);
    continue;
  }
  for (const p of broader) {
    if (!(p in ontology)) errors.push(`${name}: broader 先「${p}」が未登録。概念でもノードとして登録する`);
  }
}

// ---- 2) 循環 ----
const state = new Map(); // 0=探索中 1=完了
function visit(name, trail) {
  if (state.get(name) === 1) return;
  if (state.get(name) === 0) {
    errors.push(`循環: ${[...trail, name].join(' → ')}`);
    return;
  }
  state.set(name, 0);
  for (const p of (ontology[name] && ontology[name].broader) || []) {
    if (p in ontology) visit(p, [...trail, name]);
  }
  state.set(name, 1);
}
for (const name of Object.keys(ontology)) visit(name, []);

// ---- 3) 使われていないノード（タグとして未使用かつ誰の broader でもない）----
const referenced = new Set(Object.values(ontology).flatMap(n => (n && n.broader) || []));
for (const name of Object.keys(ontology)) {
  if (!tagPosts.has(name) && !referenced.has(name)) {
    infos.push(`未使用ノード: ${name}（タグとして使う記事が無く、broader 先でもない。タグ改名の取り残しか誤記の可能性）`);
  }
}

// ---- 4) バージョン同義の導出（scripts/version_tags.js と同じ規則）----
// 誤爆（数字込みで別概念の名前）が現れていないか目視確認するために全ペアを出す
const VERSIONED = /^(.+?)(\d+(?:\.\d+)+|\d{2,})$/;
const stemOf = name => {
  const node = ontology[name];
  if (node && node.notVersion) return null;
  if (node && node.versionOf) return node.versionOf;
  const m = VERSIONED.exec(name);
  if (!m) return null;
  return tagPosts.has(m[1]) ? m[1] : null;
};
const versionsByStem = new Map();
for (const t of tagPosts.keys()) {
  const stem = stemOf(t);
  if (!stem || stem === t) continue;
  if (!versionsByStem.has(stem)) versionsByStem.set(stem, []);
  versionsByStem.get(stem).push(t);
}
for (const [stem, versions] of [...versionsByStem.entries()].sort((a, b) => b[1].length - a[1].length)) {
  infos.push(`バージョン同義: ${stem} ⇐ ${versions.sort().join('、')}（版違いでなければ notVersion: true で除外する）`);
}

// ---- 5) 高頻度なのに未登録（増分追記の候補）----
// バージョンタグは同義展開で語幹に吸収されるので、登録を求めない
const unregistered = [...tagPosts.entries()]
  .filter(([t, posts]) => posts.length >= REGISTER_THRESHOLD && !(t in ontology) && !stemOf(t))
  .sort((a, b) => b[1].length - a[1].length);
for (const [t, posts] of unregistered) {
  infos.push(`未登録: ${t}（${posts.length}記事）。broader を判断して tag_ontology.yml に追記する`);
}

// ---- 6) 統合候補（ほぼ重複、オントロジー上の祖先関係は除外）----
const ancestors = name => {
  const acc = new Set();
  const queue = [name];
  while (queue.length) {
    const cur = queue.shift();
    for (const p of (ontology[cur] && ontology[cur].broader) || []) {
      if (!acc.has(p)) { acc.add(p); queue.push(p); }
    }
  }
  return acc;
};
const sets = [...tagPosts.entries()]
  .filter(([, posts]) => posts.length >= 2)
  .map(([t, posts]) => [t, new Set(posts)]);
for (const [a, A] of sets) {
  for (const [b, B] of sets) {
    if (a === b || B.size < A.size || B.size - A.size > 2) continue;
    if (A.size === B.size && a > b) continue;
    if ([...A].every(x => B.has(x))) {
      if (ancestors(a).has(b) || ancestors(b).has(a)) continue; // 登録済みの健全な階層
      infos.push(`統合候補: ${a}（${A.size}記事）⊆ ${b}（${B.size}記事）。同義なら統合、親子なら tag_ontology.yml に登録`);
    }
  }
}

for (const e of errors) console.log(`[ERROR] ${e}`);
for (const i of infos) console.log(`[INFO] ${i}`);
console.log(`ノード ${Object.keys(ontology).length} / タグ ${tagPosts.size} / エラー ${errors.length} / 情報 ${infos.length}`);
process.exit(errors.length ? 1 : 0);
