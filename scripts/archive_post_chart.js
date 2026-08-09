'use strict';

// 月の合計に合わせた上限。平日しか公開しないので机上は月20強
hexo.extend.helper.register('max_posts', function(year) {
  if (year) return 30;
  const acc = generatePostsSeries(this.site.posts);
  return Math.max(100, ...acc.map(item => item.count));
});

hexo.extend.helper.register('generate_posts_series_x', function(year) {
  const acc = generatePostsSeries(this.site.posts, year);
  return acc.map(e => `'${e.groupKey}'`).join(",");
});

hexo.extend.helper.register('generate_posts_series_y', function(year) {
  const acc = generatePostsSeries(this.site.posts, year);
  return acc.map(e => e.count).join(",");
});

hexo.extend.helper.register('ave_posts', function(year) {
  const acc = generatePostsSeries(this.site.posts, year);
  const ave = acc.map(e => e.count).reduce((acc, cur) => {
    return acc + cur;
  }, 0) / acc.length;

  return Math.floor(ave * 10) / 10;
});

// 年ページは月ごとの棒を、その月の第何週かで積み上げる。棒の高さが月の合計、
// 内訳で週ごとの粗密が見える（#2121）。全期間は四半期のまま。
//
// 投稿が無い期間も 0 で埋める。記事のある期間だけを並べると、
// 間隔が詰まって途切れなく出ているように見えてしまう
const generatePostsSeries = (posts, year) => {
  const target = year
    ? posts.filter(post => post.date.format('YYYY') === year.toString())
    : posts;
  if (target.length === 0) return [];

  const quarterOf = date => `${date.format('YYYY')}年${Math.ceil(Number(date.format('MM')) / 3)}Q`;
  const unit = year ? 'month' : 'quarter';

  const starts = target.map(post => post.date.clone().startOf(unit));
  let first = starts[0].clone();
  let last = starts[0].clone();
  starts.forEach(at => {
    if (at.isBefore(first)) first = at.clone();
    if (at.isAfter(last)) last = at.clone();
  });

  const counts = new Map();
  starts.forEach(at => {
    const i = at.diff(first, unit);
    counts.set(i, (counts.get(i) || 0) + 1);
  });

  const series = [];
  for (let i = 0; i <= last.diff(first, unit); i++) {
    const at = first.clone().add(i, unit);
    series.push({groupKey: year ? at.format('M月') : quarterOf(at), count: counts.get(i) || 0});
  }
  return series;
}

// 月ごとの棒を、その月の第何週かで積み上げるためのデータ。
// 週は「その月の何日目か」で決める（1〜7日 = 第1週）。ISO週にすると
// 月をまたぐ週が出て、棒の合計が月の投稿数と合わなくなる
const WEEK_SLOTS = 5;

hexo.extend.helper.register('posts_month_week_series', function(year) {
  const months = generatePostsSeries(this.site.posts, year).map(e => e.groupKey);
  const index = new Map(months.map((m, i) => [m, i]));
  const slots = Array.from({length: WEEK_SLOTS}, () => months.map(() => 0));

  this.site.posts
    .filter(post => post.date.format('YYYY') === year.toString())
    .forEach(post => {
      const i = index.get(post.date.format('M月'));
      if (i === undefined) return;
      const slot = Math.min(WEEK_SLOTS, Math.ceil(Number(post.date.format('D')) / 7)) - 1;
      slots[slot][i]++;
    });

  return JSON.stringify({months, slots});
});
