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

const ADVENT = 'アドベントカレンダー';

// ブログの外での発信 (#3428)。新しい順。日付は YAML が Date に読むので文字列に戻す
const externalOf = (authorName) =>
  ((profile[authorName] || {}).external || [])
    .map((e) => ({
      ...e,
      date: e.date instanceof Date ? e.date.toISOString().slice(0, 10) : String(e.date || ''),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

// アドベントカレンダーは著者ページで別の節に分けるので、ここからは外す
hexo.extend.helper.register('author_external', (authorName) =>
  externalOf(authorName).filter((e) => e.media !== ADVENT),
);

hexo.extend.helper.register('author_external_all', externalOf);

// アドベントカレンダーは年1回の企画なので、記事の明細より「何回・何年続けて」が
// その人の参加の姿を表す。連続は最長のもの（途中で抜けた年があれば切れる）
hexo.extend.helper.register('author_advent', (authorName) => {
  const items = externalOf(authorName).filter((e) => e.media === ADVENT);
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

// Tech Cast のパーソナリティ (#3428)。毎回の出演を明細に並べると著者ページが
// その一覧で埋まるので、役割として1つのバッジにまとめる
hexo.extend.helper.register('author_techcast_personality', (authorName) => {
  const t = (profile[authorName] || {}).techcast_personality;
  if (!t) return null;
  const year = (d) => (d instanceof Date ? d.getUTCFullYear() : Number(String(d).slice(0, 4)));
  return { episodes: t.episodes, first: year(t.first), last: year(t.last) };
});
