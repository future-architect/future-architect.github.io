'use strict';

// 連載ナビ本体。グループ化と題名の整形は lib/series.js にある
// （related_posts / reference_posts も同じ結果を使うため）

const { seriesOf, allSeries, seriesStats, seriesRelatedTags } = require('./lib/series');

hexo.extend.helper.register('series_nav', function (post) {
  return seriesOf(this.site, post);
});

// 索引記事の lede にある名乗り（「◯◯連載のインデックス記事です。」）。
// パネルのラベルとタイトルが既に同じことを言うので説明文からは落とす (#2892)
const INDEX_DECLARATION = /(インデックス|索引)(記事)?(です|となります|になります)。$/;

/**
 * 特集のパネルに出す説明文。索引記事の lede の第1文を借りる (#3135)。
 *
 * ガイドラインのパネル（「設計ガイドライン・コーディング規約・TypeScript 教材の
 * 入口です。」37字）と同じ「1文で行き先を名乗る」レベルに揃える。
 * 78連載の第1文は中央値41字・26本が1行・35本が2行で、この帯に収まる。
 *
 * 名乗りしか無い連載（78本中4本）は null を返し、呼び出し側が今までの
 * 「全N本・YYYY.MM 更新」に戻す。
 */
function panelSummary(lede) {
  if (!lede) return null;
  const sentences = String(lede)
    .split(/(?<=。)/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.find((s) => !INDEX_DECLARATION.test(s)) || null;
}

/**
 * ホームの「特集」に出す連載 (#3135)。
 *
 * **同じ画面の新着一覧に1本も出ていない連載**のうち、最後に更新されたものを返す。
 * 最新の連載はその記事自体がすぐ下の新着一覧に並ぶので、パネルにしても二重になる。
 * 新着一覧に出ているかは page.posts と突き合わせれば分かるので、
 * 「何日空いたら完走とみなすか」の閾値を持たなくてよい。
 *
 * 完走の推定としても十分で、実測ではこの条件を満たす連載は最終記事から
 * 43〜145日（中央値68日）空いている。連載内の投稿間隔571件のうち
 * 43日以上あいたのは13件（2.3%）しかない。
 *
 * 窓は6ヶ月。過去24ヶ月のどの月でも候補が1本以上あった下限は4.8ヶ月
 * （2026年4月の145日）で、1ヶ月刻みに切り上げた5ヶ月では余裕が5日しか残らない。
 */
hexo.extend.helper.register(
  'featured_series',
  function (shownPosts, windowMonths = 6, minPosts = 3) {
    const list = shownPosts && shownPosts.toArray ? shownPosts.toArray() : shownPosts || [];
    const shown = new Set(list.map((p) => p.path));
    const now = Date.now();
    const windowMs = windowMonths * 30 * 24 * 60 * 60 * 1000;
    // allSeries は更新が新しい順なので、条件に合う先頭がそのまま「最後に完走した連載」
    const found = allSeries(this.site).find(
      (s) =>
        s.total >= minPosts &&
        s.index.thumbnail &&
        now - s.latest.valueOf() <= windowMs &&
        !s.posts.some((p) => shown.has(p.path)),
    );
    return found ? { ...found, summary: panelSummary(found.index.lede) } : null;
  },
);

// /series/ 一覧ページ（#2304）。更新が新しい順の全連載
hexo.extend.helper.register('all_series', function () {
  return allSeries(this.site);
});

// /series/ の関連タグ。索引タグと恒例行事の企画名（規則は lib/series.js）
hexo.extend.helper.register('series_related_tags', function () {
  return seriesRelatedTags(this.site);
});

// /series/ の統計。累計と直近1年 (#2572)
hexo.extend.helper.register('series_stats', function () {
  return seriesStats(this.site);
});

hexo.extend.generator.register('series-list', function (locals) {
  // ページ生成に1件必要なだけのダミー。categories.js と同じ流儀
  const pagination = require('hexo-pagination');
  return pagination('series', locals.posts.sort('-date').slice(0, 1), {
    layout: ['series', 'archive', 'index'],
  });
});
