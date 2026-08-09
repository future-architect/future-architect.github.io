'use strict';

const fs = require("fs");
const {postListItem} = require("./lib/post_list");

const load = JSON.parse(fs.readFileSync("ga4_pv.json", 'utf-8'));
const map = new Map();
load.pv.forEach((obj) => {
  map.set(obj.path, obj);
});

const getGA4PV = url => map.get(url)?.pv || 0;

// 実測値が無いときは 0 を返す。以前は 100 を返していたが、実際に pv が 100 の
// 記事も 55 件あり、表示上どちらか区別できなかった。公開直後の記事に
// 架空の「100 View」が出るのは、読了時間を出さないのと同じ理由で避けたい
hexo.extend.helper.register("get_ga4_pv", url => {
  const pv = getGA4PV("/" + url);
  return pv > 0 ? pv.toLocaleString() : '';
});

// 指定した記事の中から PV の多い順に取り出す。カテゴリ・タグの一覧ページで
// 「よく読まれている記事」を出すのに使う（#2033 / #2034）
hexo.extend.helper.register('popular_posts_in', function(posts, limit = 5) {
  const ranked = posts
    .map(post => ({post, pv: getGA4PV('/' + post.path)}))
    .filter(x => x.pv > 0)
    // 同点の決着が無いとビルドごとに並びが変わる
    .sort((a, b) => b.pv - a.pv || (a.post.path < b.post.path ? -1 : 1))
    .slice(0, limit);

  if (ranked.length === 0) return '';

  const links = ranked.map(x => postListItem(x.post, 'featured-posts-item')).join('\n');
  return `<div class="widget"><ul class="nav featured-post-link">${links}</ul></div>`;
});
