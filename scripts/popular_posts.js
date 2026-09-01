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
// 順位の丸をネイビーで塗る最後の順位 (#2681)。塗るのは表彰台の3件までで、
// 4位以下は地のグレーに任せる。10位まで塗ると塗りの帯が強すぎた
const RANK_NAVY_LAST = 3;

// 順位の丸の中身と段のクラスを決める (#2681)。
// 段は「1位＝クリムゾンに王冠 / 2〜3位＝ネイビーに数字 / 4位以下＝地のグレーに数字」。
// 1位だけ数字を王冠に置き換えるので、読み上げには sr-only で順位を残す
// （王冠の svg は aria-hidden なので、これが無いと1位だけ順位を名乗らなくなる）。
// crownSvg は呼び出し側がアイコン辞書から取って渡す
const rankMark = (rank, crownSvg) => {
  if (rank === 1) {
    return { html: `${crownSvg}<span class="sr-only">1</span>`, className: 'post-list-rank-first' };
  }
  return { html: String(rank), className: rank <= RANK_NAVY_LAST ? 'post-list-rank-high' : '' };
};

// caps は各段の終端順位（累積）。[10, 25] なら 10位まで表示 + 25位まで畳み
const rankingList = (ctx, posts, crownSvg, caps = [RANKING_DISPLAY_COUNT, RANKING_MAX_COUNT]) => {
  // 順位はマークアップ側で振る。CSS カウンタだと「10件で畳む」定数と
  // 二重管理になる。畳んだ側は11位から続く
  const items = (list, offset) =>
    list
      .map((post, i) =>
        // NEW を出すのはここだけ (#2788)。PV 順の並びは新しさと無関係なので、
        // 「まだ読んでいないかもしれない新顔」の合図として働く
        postListItem(ctx, post, 'featured-posts-item', {
          withThumb: true,
          rankMark: rankMark(offset + i + 1, crownSvg),
          withNew: true,
        }),
      )
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

  // 同点はパスで決める（決着が無いとビルドごとに並びが変わる）。
  // GA4 の PV は 100 単位に丸められているので、下位ほど同点が出る
  const compareFunc = (a, b) => b.pv - a.pv || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);

  let [rate3d, rate1w, rate2w, rate4w, rate2m, rate3m, rate6m, rate12m] = [
    10, 8, 5, 4, 3.5, 3, 2.5, 2,
  ];
  if (term === 'yearly') {
    [rate3d, rate1w, rate2w, rate4w, rate2m, rate3m, rate6m, rate12m] = [3, 3, 3, 2, 2, 1.5, 1, 1];
  }

  // GA のパスから記事を引くのはパスの完全一致で行う。部分一致だと
  // 一覧ページ /articles/ が全記事の permalink に含まれて全件に一致し、
  // 先頭の1本が一覧ページの PV を持ってしまう。どれが先頭かは
  // site.posts.data の格納順＝ファイルを読み終えた順で、コールドビルドの
  // たびに変わる。完全一致なら一覧ページはどの記事にも当たらず落ちる
  const postByPath = new Map(this.site.posts.data.map((post) => [`/${post.path}`, post]));

  const popularPosts = gaCache[term]
    .flatMap((gaPage) => {
      const post = postByPath.get(gaPage.path);
      if (!post) return [];
      post.pv = parseInt(gaPage.pv);
      return [post];
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
  // アイコンのパスは svg-icon.ejs の辞書が1箇所で持つ決まりなので、
  // JS 側にパスを書き写さずヘルパーの実行文脈から partial を引く (#2681)
  return rankingList(
    this,
    popularPosts,
    this.partial('_partial/svg-icon', { icon: 'crown' }).trim(),
    caps,
  );
});
