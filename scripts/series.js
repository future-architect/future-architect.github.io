'use strict';

// 連載ナビ本体。グループ化と題名の整形は lib/series.js にある
// （related_posts / reference_posts も同じ結果を使うため）

const {seriesOf, allSeries} = require('./lib/series');

hexo.extend.helper.register('series_nav', function(post) {
  return seriesOf(this.site, post);
});

// ホームの「連載から探す」。更新が新しい順に、索引へのリンクとサムネイルを返す
hexo.extend.helper.register('recent_series', function(limit = 4, minPosts = 3) {
  return allSeries(this.site)
    .filter(s => s.total >= minPosts && s.index.thumbnail)
    .slice(0, limit);
});

// /series/ 一覧ページ（#2304）。更新が新しい順の全連載
hexo.extend.helper.register('all_series', function() {
  return allSeries(this.site);
});

hexo.extend.generator.register('series-list', function(locals) {
  // ページ生成に1件必要なだけのダミー。categories.js と同じ流儀
  const pagination = require('hexo-pagination');
  return pagination('series', locals.posts.sort('-date').slice(0, 1), {
    layout: ['series', 'archive', 'index'],
  });
});
