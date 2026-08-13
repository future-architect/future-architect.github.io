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

hexo.extend.helper.register('author_awards', function (author) {
  const rows = (this.site.data && this.site.data.awards) || [];
  const years = rows
    .filter((r) => r.author === author)
    .map((r) => r.year)
    .sort();
  if (years.length === 0) return null;
  return { years, hallOfFame: years.length >= HALL_OF_FAME_WINS };
});
