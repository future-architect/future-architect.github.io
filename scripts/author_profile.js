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

// アドベントカレンダー (#3428)。記事の一覧（source/_data/advent_calendar_entries.yml）は
// Qiita のユーザー名だけを持ち、_profile.yml に qiita_id がある人にだけつなぐ。
// こちらで Qiita のアカウントと実名を名寄せしないため。
// 年1回の企画なので、明細より「何回・何年続けて」がその人の参加の姿を表す。
// 連続は最長のもの（途中で抜けた年があれば切れる）
hexo.extend.helper.register('author_advent', function (authorName) {
  const qiitaId = ((profile[authorName] || {}).qiita_id || '').toLowerCase();
  if (!qiitaId) return null;
  const items = (this.site.data.advent_calendar_entries || [])
    .filter((e) => String(e.user).toLowerCase() === qiitaId)
    .map((e) => ({
      ...e,
      // ブログの記事を登録した枠はサイト内のリンクにする
      url: String(e.url).replace(/^https?:\/\/future-architect\.github\.io/, ''),
      // db.json 経由だと Date が ISO 文字列で戻るので、どちらでも日付だけに切る
      date: (e.date instanceof Date ? e.date.toISOString() : String(e.date)).slice(0, 10),
    }))
    // 枠の登録者と記事の書き手が違うことがある（他の人のブログ記事を代理で登録した枠）。
    // ブログの記事は author が書き手を名乗るので、そちらと一致するものだけを残す
    .filter((e) => {
      if (!e.url.startsWith('/')) return true;
      const post = this.site.posts.findOne({ path: e.url.replace(/^\//, '') });
      return !post || post.author === authorName;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!items.length) return null;
  const years = [...new Set(items.map((e) => Number(e.date.slice(0, 4))))].sort((a, b) => a - b);
  let best = { from: years[0], to: years[0] };
  let from = years[0];
  years.forEach((y, i) => {
    if (i && y !== years[i - 1] + 1) from = y;
    if (y - from > best.to - best.from) best = { from, to: y };
  });
  return {
    items,
    years: years.length,
    first: years[0],
    last: years[years.length - 1],
    streak: best.to - best.from + 1,
    streakFrom: best.from,
    streakTo: best.to,
  };
});

// アーキテクチャガイドラインの作成・レビュー (#3447)。名前は謝辞の表記のまま照合し、
// こちらで名寄せしない（アドベントカレンダーと同じ）
hexo.extend.helper.register('author_guidelines', function (authorName) {
  const day = (d) => (d instanceof Date ? d.toISOString() : String(d)).slice(0, 10);
  const all = this.site.data.guidelines || [];
  const items = all
    .filter((g) => (g.authors || []).includes(authorName))
    .map((g) => ({ title: g.title, url: g.url, date: day(g.date) }))
    .sort((a, b) => b.date.localeCompare(a.date));
  const reviewed = all.filter((g) => (g.reviewers || []).includes(authorName)).length;
  return { items, reviewed };
});

// 被参照: ほかの著者の記事からのリンク。自分の記事からのリンク、索引記事（インデックスタグ）
// からのリンク、索引記事へのリンクは数えない。自分では張れるうえ、索引記事との間のリンクは
// 連載に入れば機械的に付く（各記事の冒頭が索引記事を指す）ので、
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
    const isIndex = post.tags.some((t) => t.name === 'インデックス');
    post.categories.forEach((c) => categories.add(c.name));
    post.tags.forEach((t) => tags.add(t.name));
    const id = (post.path.match(/articles\/([^/]+)\//) || [])[1];
    if (!isIndex) referenced += (refs.get(id) || []).filter((a) => a !== author).length;
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
