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

/**
 * 表紙は記事のサムネイルを既定にする。1冊だけを扱う記事はサムネイルにその表紙を
 * 使うのが慣例で、そうでない記事だけ cover: が上書きする。
 * **複数の号をまとめて紹介する記事のサムネイルは借りない**（寄稿まとめ記事の
 * サムネイルは表紙のコラージュで、どの号のものでもない）。表紙が分からない行は
 * 空き枠になる
 */
const coverOf = (post, item, siblings) =>
  item.cover || (siblings.length === 1 ? post.thumbnail || '' : '');

const entry = (post, item, siblings) => ({
  name: item.name,
  url: item.url,
  work: item.work || '',
  by: item.by || post.author || '',
  cover: coverOf(post, item, siblings),
  post: { title: post.title, path: '/' + post.path },
  key: issueKey(item.url),
  date: post.date.valueOf(),
});

/**
 * 1行は「号＋章」で、同じ章に複数人が寄稿していれば書いた人をその行の中に積む。
 * 号だけを見出しにすると、章の違う寄稿に並ぶ「誰が」がどちらの章のものか読めない
 */
const groupByIssue = (magazines) => {
  const issues = [];
  magazines.forEach((m) => {
    const last = issues[issues.length - 1];
    const item = { by: m.by, post: m.post };
    if (last && last.url === m.url && last.work === m.work) {
      last.items.push(item);
      // 表紙は同じ号のどれか1つが分かれば足りる
      last.cover = last.cover || m.cover;
      return;
    }
    issues.push({ name: m.name, url: m.url, work: m.work, cover: m.cover, items: [item] });
  });
  return issues;
};

hexo.extend.helper.register('publications', function () {
  const books = [];
  const magazines = [];
  this.site.posts.forEach((post) => {
    (post.books || []).forEach((b, _i, all) => books.push(entry(post, b, all)));
    (post.magazines || []).forEach((m, _i, all) => magazines.push(entry(post, m, all)));
  });
  books.sort((a, b) => b.date - a.date || (a.name < b.name ? -1 : 1));
  magazines.sort((a, b) => b.key - a.key || b.date - a.date || (a.name < b.name ? -1 : 1));
  // 冊数ではなく寄稿の件数を本文が名乗るので、まとめる前の数も返す
  return { books, magazines: groupByIssue(magazines), magazineCount: magazines.length };
});
