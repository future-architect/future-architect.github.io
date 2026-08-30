'use strict';

/**
 * 出版・寄稿の一覧 (#2912)。記事のフロントマターの books / magazines から集める。
 * マスタを別ファイルに持たないので、書いた本人が記事を書くときに一緒に書ける。
 *
 * 並びは記事の日付ではなく「出たもの」の順。雑誌は URL の号（/archive/YYYY/YYYYMM）を
 * 数値にして比べ、巻で数える WEB+DB PRESS（/archive/YYYY/volNNN）は年までしか
 * 取れないのでその年の最後（YYYY12）に置く。取れる行と取れない行で基準を変えると
 * 比較が一貫しなくなるので、全部を1つの数値に寄せてから比べる。
 * 書籍の URL には日付が無いので、発売のアナウンス記事の日付で並べる
 */
const issueKey = (url) => {
  const m = /\/archive\/(\d{4})\/(\d{6}|vol\d+)/.exec(url || '');
  if (!m) return 0;
  return /^\d{6}$/.test(m[2]) ? Number(m[2]) : Number(m[1]) * 100 + 12;
};

const entry = (post, item) => ({
  name: item.name,
  url: item.url,
  work: item.work || '',
  by: item.by || post.author || '',
  post: { title: post.title, path: '/' + post.path },
  key: issueKey(item.url),
  date: post.date.valueOf(),
});

hexo.extend.helper.register('publications', function () {
  const books = [];
  const magazines = [];
  this.site.posts.forEach((post) => {
    (post.books || []).forEach((b) => books.push(entry(post, b)));
    (post.magazines || []).forEach((m) => magazines.push(entry(post, m)));
  });
  books.sort((a, b) => b.date - a.date || (a.name < b.name ? -1 : 1));
  magazines.sort((a, b) => b.key - a.key || b.date - a.date || (a.name < b.name ? -1 : 1));
  return { books, magazines };
});
