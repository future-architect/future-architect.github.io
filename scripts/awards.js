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
  if (!row) return null;
  // メダルの色は著者のその年時点の受賞回数で決まる（灰→銅→金）。
  // 一覧・著者ページと同じ規則にする (#2409)
  const years = rows
    .filter((r) => r.author === row.author)
    .map((r) => r.year)
    .sort((a, b) => a - b);
  // その年の発表記事（選出理由が書かれている）。バッジのリンク先にする (#2562)。
  // 記録が無い年は null で、バッジはリンクにならない
  const announcements = (this.site.data && this.site.data.award_announcements) || {};
  const announcement = announcements[String(row.year)];
  return {
    year: row.year,
    author: row.author,
    nth: years.indexOf(row.year) + 1,
    announcement: announcement ? `articles/${announcement}/` : null,
  };
});

hexo.extend.helper.register('author_awards', function (author) {
  const rows = (this.site.data && this.site.data.awards) || [];
  const mine = rows.filter((r) => r.author === author).sort((a, b) => b.year - a.year); // 新しい年を先に
  if (mine.length === 0) return null;
  // 受賞年のバッジは代表記事へのリンクにする (#2760)。article が無い年
  // （2020年）と、書かれていても記事が見つからない場合は article を null で
  // 返し、EJS 側はリンクにしない
  const years = mine.map((r) => {
    const post = r.article ? this.site.posts.findOne({ path: `articles/${r.article}/` }) : null;
    return {
      year: r.year,
      article: post ? post.path : null,
      title: post ? post.title : null,
    };
  });
  return { years, hallOfFame: mine.length >= HALL_OF_FAME_WINS };
});

// 賞の名前から受賞発表・振り返りの記事一覧へ飛ばす (#2760)。URL は
// _config.yml の tag_map で変わりうるので、名前からタグの path を引く。
// タグが無ければ null を返し、EJS 側はリンクにしない
const AWARD_TAG = 'ベスブロ';

hexo.extend.helper.register('award_tag_path', function () {
  const tag = this.site.tags && this.site.tags.findOne({ name: AWARD_TAG });
  return tag ? tag.path : null;
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
    // 表示は新しい受賞が先 (#2451)。nth は昇順の位置で決まるので、
    // 並べ替える前に年へ埋めておく
    .map(([author, ys]) => ({
      author,
      years: ys.map((year, i) => ({ year, nth: i + 1 })).reverse(),
      wins: ys.length,
    }));

  return { hall, years };
});
