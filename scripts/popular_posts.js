'use strict';

const { postListItem } = require('./lib/post_list');

const fs = require('fs');
const gaCache = JSON.parse(fs.readFileSync('ga_cache.json', 'utf-8'));

// ランキング（トレンド・年間人気）の表示件数。
// 記事が長文化する傾向にあるため、トップページのスクロール量を抑える目的で絞り、
// 11位以下は details で畳んで25位まで辿れるようにする (#2249)。
// details ならJSを足さずに済む（参照記事の畳みと同じ作り）
const RANKING_DISPLAY_COUNT = 10;
const RANKING_MAX_COUNT = 25;
// 年間人気だけ2段目のおかわりで50位まで辿れる (#2309)。
// PVの実測でテールに読む価値が残っているのは年間だけ
// （25位: 年間4,532 / 月間336。トレンドの26位以下はほぼ横一線のノイズ帯）
const RANKING_YEARLY_MAX_COUNT = 50;

// caps は各段の終端順位（累積）。[10, 25] なら 10位まで表示 + 25位まで畳み
const rankingList = (posts, caps = [RANKING_DISPLAY_COUNT, RANKING_MAX_COUNT]) => {
  // 順位はマークアップ側で振る。CSS カウンタだと「10件で畳む」定数と
  // 二重管理になる。畳んだ側は11位から続く
  const items = (list, offset) =>
    list
      .map((post, i) => postListItem(post, 'featured-posts-item', undefined, true, offset + i + 1))
      .join('\n');
  // 段の境界。残りが1件だけの段は畳む意味がないので前段に吸収する
  const bounds = [];
  for (const cap of caps) {
    if (posts.length <= cap + 1) {
      bounds.push(posts.length);
      break;
    }
    bounds.push(cap);
  }
  // 2段目は「開いた人がさらに深掘りする」動線なので、1段目の details の中に入れ子にする
  const build = (idx) => {
    if (idx >= bounds.length || bounds[idx - 1] >= posts.length) return '';
    // 件数は「このクリックで追加表示される数」を出す（全残数だと開いた数と合わない）。
    // 入れ子の最終段だけ、それで打ち止めだと分かるよう「残りの」にする
    const count = bounds[idx] - bounds[idx - 1];
    const isNestedLast = idx > 1 && idx === bounds.length - 1;
    return `
    <details class="ranking-more">
      <summary>${isNestedLast ? '残りの' : '残り'} ${count}本を表示</summary>
      <ul class="nav featured-post-link">${items(posts.slice(bounds[idx - 1], bounds[idx]), bounds[idx - 1])}</ul>${build(idx + 1)}
    </details>`;
  };
  return `
  <div class="widget">
    <ul class="nav featured-post-link">${items(posts.slice(0, bounds[0]), 0)}</ul>${build(1)}
  </div>
  `;
};

hexo.extend.helper.register('popular_posts', function (term = 'weekly') {
  const yearAgo = new Date();
  yearAgo.setDate(yearAgo.getDate() - 365); // 1year
  const halfYearAgo = new Date();
  halfYearAgo.setDate(halfYearAgo.getDate() - 180); // 6month
  const threeMonthAgo = new Date();
  threeMonthAgo.setDate(threeMonthAgo.getDate() - 90); // 3month
  const twoMonthAgo = new Date();
  twoMonthAgo.setDate(twoMonthAgo.getDate() - 60); // 2month
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30); // 1month
  const twoWeekAgo = new Date();
  twoWeekAgo.setDate(twoWeekAgo.getDate() - 15); // 2week
  const aWeekAgo = new Date();
  aWeekAgo.setDate(aWeekAgo.getDate() - 7); // 1week
  const threeDayAgo = new Date();
  threeDayAgo.setDate(threeDayAgo.getDate() - 3); // 3day

  const compareFunc = (a, b) => {
    return b.pv - a.pv;
  };

  let [rate3d, rate1w, rate2w, rate4w, rate2m, rate3m, rate6m, rate12m] = [
    10, 8, 5, 4, 3.5, 3, 2.5, 2,
  ];
  if (term === 'yearly') {
    [rate3d, rate1w, rate2w, rate4w, rate2m, rate3m, rate6m, rate12m] = [3, 3, 3, 2, 2, 1.5, 1, 1];
  }

  const popularPosts = gaCache[term]
    .filter((gaPage) => gaPage.path.indexOf('articles') > 0)
    .filter((gaPage) => {
      return this.site.posts.data.some((post) => post.permalink.indexOf(gaPage.path) > 0);
    })
    .flatMap((gaPage) => {
      const post = this.site.posts.data
        .filter((post) => post.permalink.indexOf(gaPage.path) > 0)
        .slice(0, 1);
      if (post && post.length > 0) {
        post[0].pv = parseInt(gaPage.pv);
        return post;
      }
      return []; // もしpostがundefinedや空の配列なら空の配列を返す
    })
    .map((post) => {
      if (post.date.toISOString() >= threeDayAgo.toISOString()) {
        post.pv = post.pv * rate3d;
      } else if (post.date.toISOString() >= aWeekAgo.toISOString()) {
        post.pv = post.pv * rate1w;
      } else if (post.date.toISOString() >= twoWeekAgo.toISOString()) {
        post.pv = post.pv * rate2w;
      } else if (post.date.toISOString() >= monthAgo.toISOString()) {
        post.pv = post.pv * rate4w;
      } else if (post.date.toISOString() >= twoMonthAgo.toISOString()) {
        post.pv = post.pv * rate2m;
      } else if (post.date.toISOString() >= threeMonthAgo.toISOString()) {
        post.pv = post.pv * rate3m;
      } else if (post.date.toISOString() >= halfYearAgo.toISOString()) {
        post.pv = post.pv * rate6m;
      } else if (post.date.toISOString() >= yearAgo.toISOString()) {
        post.pv = post.pv * rate12m;
      }
      return post;
    })
    .filter((post) => post.pv >= 0)
    .sort(compareFunc)
    .slice(0, term === 'yearly' ? RANKING_YEARLY_MAX_COUNT : RANKING_MAX_COUNT);

  const caps =
    term === 'yearly'
      ? [RANKING_DISPLAY_COUNT, RANKING_MAX_COUNT, RANKING_YEARLY_MAX_COUNT]
      : [RANKING_DISPLAY_COUNT, RANKING_MAX_COUNT];
  return rankingList(popularPosts, caps);
});
