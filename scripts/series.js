'use strict';

// 連載ナビ本体。グループ化と題名の整形は lib/series.js にある
// （related_posts / reference_posts も同じ結果を使うため）

const {seriesOf} = require('./lib/series');

hexo.extend.helper.register('series_nav', function(post) {
  return seriesOf(this.site, post);
});
