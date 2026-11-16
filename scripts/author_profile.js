'use strict';

const loadYamlFile = (filename) => {
  const fs = require('fs');
  const yaml = require('js-yaml');
  const yamlText = fs.readFileSync(filename, 'utf8');
  return yaml.load(yamlText);
};

const profile = loadYamlFile('./_profile.yml');

// 著者プロフィールの生データ。JSON-LD (#2462)・記事末の著者紹介・著者ページが読む。
// HTML を組み立てて返さないのは、アイコンの絵柄を _partial/svg-icon.ejs の辞書
// 1箇所に持たせるため。JS の中でリンクを作ると絵柄が二重になり、
// textlint の外部リンク検査からも見えなくなる (#2774)
hexo.extend.helper.register('get_profile_data', (authorName) => profile[authorName] || null);

// ブログの外での発信 (#3428)。新しい順。日付は YAML が Date に読むので文字列に戻す
hexo.extend.helper.register('author_external', (authorName) =>
  ((profile[authorName] || {}).external || [])
    .map((e) => ({
      ...e,
      date: e.date instanceof Date ? e.date.toISOString().slice(0, 10) : String(e.date || ''),
    }))
    .sort((a, b) => b.date.localeCompare(a.date)),
);

// Tech Cast のパーソナリティ (#3428)。毎回の出演を明細に並べると著者ページが
// その一覧で埋まるので、役割として1つのバッジにまとめる
hexo.extend.helper.register('author_techcast_personality', (authorName) => {
  const t = (profile[authorName] || {}).techcast_personality;
  if (!t) return null;
  const year = (d) => (d instanceof Date ? d.getUTCFullYear() : Number(String(d).slice(0, 4)));
  return { episodes: t.episodes, first: year(t.first), last: year(t.last) };
});

// 被参照: ほかの著者の記事からのリンク。自分の記事と索引記事（インデックスタグ）からの
// リンクは数えない。前者は自分で張れ、後者は連載に入れば機械的に付くので、
// 「ほかの人に参照された」ことを表さない。全記事の本文を1度だけ走査して持つ
let refCache = null;
const referencesByPost = (posts) => {
  if (refCache && refCache.size === posts.length) return refCache.map;
  const map = new Map();
  posts.forEach((p) => {
    if (p.tags.some((t) => t.name === 'インデックス')) return;
    const ids = new Set();
    for (const m of (p.content || '').matchAll(/\/articles\/(\d{8}[a-z]?)\//g)) ids.add(m[1]);
    ids.forEach((id) => {
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(p.author);
    });
  });
  refCache = { size: posts.length, map };
  return map;
};

// 著者ページのサイドバーの統計 (#3428)。登壇は登壇レポートのタグ、
// 出版・寄稿は books / magazines の書き手（by、無ければ記事の author）で数える
hexo.extend.helper.register('author_activity_counts', function (author) {
  const posts = this.site.posts.toArray();
  const refs = referencesByPost(posts);
  const series = new Set();
  const categories = new Set();
  const tags = new Set();
  let talks = 0;
  let books = 0;
  let magazines = 0;
  let referenced = 0;
  posts.forEach((post) => {
    (post.books || []).forEach((b) => (b.by || post.author) === author && books++);
    (post.magazines || []).forEach((m) => (m.by || post.author) === author && magazines++);
    if (post.author !== author) return;
    if (post.tags.some((t) => t.name === '登壇レポート')) talks++;
    if (post.series) series.add(post.series);
    post.categories.forEach((c) => categories.add(c.name));
    post.tags.forEach((t) => tags.add(t.name));
    const id = (post.path.match(/articles\/([^/]+)\//) || [])[1];
    referenced += (refs.get(id) || []).filter((a) => a !== author).length;
  });
  const t = profile[author] || {};
  const techcast =
    (t.external || []).filter((e) => e.media === 'Tech Cast').length +
    ((t.techcast_personality || {}).episodes || 0);
  return {
    talks,
    books,
    magazines,
    techcast,
    series: series.size,
    referenced,
    categories: categories.size,
    tags: tags.size,
  };
});
