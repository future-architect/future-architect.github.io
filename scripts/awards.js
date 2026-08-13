'use strict';

/**
 * 著者ページの表彰表示（#2149）。受賞記録は source/_data/awards.yml。
 *
 * 機械算出のバッジ（GOLD/SILVER 等）は付けない。会社が publish する場で
 * 従業員を機械集計で公開ランク付けする形になり、勝者と同時に敗者を作る。
 * 審査による実在の表彰（Best Blogger of the Year）とも競合する。
 * 表示するのは人が選んだ表彰の記録だけで、受賞者のページにだけ出る
 * （非受賞者には何も付かない）。
 */

// 3回受賞で殿堂入り（2022年に澁川さんが最速で到達した運用ルール）
const HALL_OF_FAME_WINS = 3;

// 受賞記事のバッジ (#2422)。awards.yml の行に article（URL の記事ID。
// 例: 20240726a）を書くと、その記事にバッジが出る。
// 表彰は人に贈られるもので、対象記事の記録が残っていない年もあるため、
// article は任意。書かなければ著者ページの表彰表示だけが出る
hexo.extend.helper.register('article_award', function (post) {
  const rows = (this.site.data && this.site.data.awards) || [];
  const id = String(post.path || '')
    .replace(/^articles\//, '')
    .replace(/\/$/, '');
  const row = rows.find((r) => r.article && String(r.article) === id);
  return row ? { year: row.year, author: row.author } : null;
});

hexo.extend.helper.register('author_awards', function (author) {
  const rows = (this.site.data && this.site.data.awards) || [];
  const years = rows
    .filter((r) => r.author === author)
    .map((r) => r.year)
    .sort((a, b) => b - a); // 新しい年を先に
  if (years.length === 0) return null;
  return { years, hallOfFame: years.length >= HALL_OF_FAME_WINS };
});

// /authors/ の表彰一覧 (#2409)。受賞バッジは著者ページにしか出ないため、
// 顔ぶれを一覧で見る場所をここで作る。新人賞などの部門が増えたら
// awards.yml に kind フィールドを足して拡張する。
//
// 返すのは2つ。hall は殿堂入り（3回受賞）で、年1回の表彰の主役なので
// 一覧では大きく扱う。years は年ごとの受賞者で、殿堂入りの人も
// その年の記録として含める（記録から人を抜くと年の顔ぶれが嘘になる）。
// nth はその年時点の累計受賞回数
hexo.extend.helper.register('awards_list', function () {
  const rows = (this.site.data && this.site.data.awards) || [];
  const yearsByAuthor = new Map();
  for (const r of rows.slice().sort((a, b) => a.year - b.year)) {
    if (!yearsByAuthor.has(r.author)) yearsByAuthor.set(r.author, []);
    yearsByAuthor.get(r.author).push(r.year);
  }

  const byYear = new Map();
  for (const r of rows) {
    if (!byYear.has(r.year)) byYear.set(r.year, []);
    const nth = yearsByAuthor.get(r.author).indexOf(r.year) + 1;
    byYear.get(r.year).push({ name: r.author, nth });
  }
  const years = [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, authors]) => ({ year, authors }));

  const hall = [...yearsByAuthor.entries()]
    .filter(([, ys]) => ys.length >= HALL_OF_FAME_WINS)
    // 到達が早い順（同数なら名前）に並べる
    .sort((a, b) => a[1][HALL_OF_FAME_WINS - 1] - b[1][HALL_OF_FAME_WINS - 1])
    .map(([author, ys]) => ({ author, years: ys, wins: ys.length }));

  return { hall, years };
});
