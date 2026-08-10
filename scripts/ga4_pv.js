'use strict';

const fs = require("fs");
const {snsLabel} = require("./lib/post_list");

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

// 推薦の件数は記事数から決める。推薦が全記事の半分を超えると
// 一覧の並べ替えにしかならず、新着とほぼ同じ顔ぶれになるため、
// 2件には4本以上、4件には8本以上、6件には12本以上を要求する (#2173 / #2272)
function recommendLimit(count) {
  if (count <= 3) return 0;
  if (count <= 7) return 2;
  if (count <= 11) return 4;
  return 6;
}

// 指定した記事の中から PV の多い順に取り出す。カテゴリ・タグの一覧ページで
// 「よく読まれている記事」を出すのに使う（#2033 / #2034）。
// limit を省略すると記事数に応じた件数になる
hexo.extend.helper.register('popular_posts_in', function(posts, limit) {
  if (limit === undefined) limit = recommendLimit(posts.length);
  if (limit === 0) return '';
  // PV は累積なので、古い記事ほど有利になる。経過年数で割って、
  // 何年もかけて積んだ数字と最近読まれている数字を並べられるようにする。
  // 分母を 1+... にしているのは、公開直後の記事で 0 除算にしないため。
  // 年数のペナルティは線形だと弱く、累積PVの大きい古典が上位に残り続けた。
  // 2乗にする（1年落ち=1/2、2年=1/5、4年=1/17）。著者ページで古い記事
  // ばかりが並ぶと、その著者が最近書けていないように見えてしまうし、
  // この業界では数年前の記事は十分古い。効きの強さをページの種類
  // （カテゴリ・タグ・著者）で分けることはしない (#2174)
  const YEAR = 365 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const score = post => {
    const years = (now - post.date.valueOf()) / YEAR;
    return getGA4PV('/' + post.path) / (1 + years * years);
  };

  const ranked = posts
    .map(post => ({post, pv: getGA4PV('/' + post.path), score: score(post)}))
    .filter(x => x.pv > 0)
    // 同点の決着が無いとビルドごとに並びが変わる
    .sort((a, b) => b.score - a.score || (a.post.path < b.post.path ? -1 : 1))
    .slice(0, limit);

  if (ranked.length === 0) return '';

  // マークアップはホームの「連載から探す」と同じカード。2列で並べる
  const cards = ranked.map(({post}) => {
    const thumb = post.thumbnail
      ? `<a href="/${post.path}" title="${post.title}" class="img_wrap panel-thumb"><img src="${post.thumbnail}" alt="" width="200" height="135" loading="lazy"></a>`
      : '';
    return `<div class="col-12 col-md-6"><div class="article-card post-panel h-100">${thumb}`
      + `<div class="panel-body"><a href="/${post.path}" class="panel-title">${post.title}</a>`
      + `<div class="panel-meta">${post.date.format('YYYY.MM.DD')}${snsLabel(post.permalink)}</div>`
      + `</div></div></div>`;
  }).join('');

  return `<div class="row g-4">${cards}</div>`;
});
