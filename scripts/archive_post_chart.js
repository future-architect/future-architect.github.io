'use strict';

// 上限はその年の実データに合わせる。年ごとに投稿ペースが違うため、
// 固定にすると棒が潰れる年と余白だらけの年ができる。
// 目盛が半端にならないよう 5 刻みに切り上げる
hexo.extend.helper.register('max_posts', function (year) {
  const acc = generatePostsSeries(this.site.posts, year);
  const peak = Math.max(0, ...acc.map((item) => item.count));
  const step = year ? 5 : 10;
  return Math.max(step * 2, Math.ceil(peak / step) * step);
});

hexo.extend.helper.register('generate_posts_series_x', function (year) {
  const acc = generatePostsSeries(this.site.posts, year);
  return acc.map((e) => `'${e.groupKey}'`).join(',');
});

hexo.extend.helper.register('generate_posts_series_y', function (year) {
  const acc = generatePostsSeries(this.site.posts, year);
  return acc.map((e) => e.count).join(',');
});

hexo.extend.helper.register('ave_posts', function (year) {
  const acc = generatePostsSeries(this.site.posts, year);
  const ave =
    acc
      .map((e) => e.count)
      .reduce((acc, cur) => {
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
    ? posts.filter((post) => post.date.format('YYYY') === year.toString())
    : posts;
  if (target.length === 0) return [];

  const quarterOf = (date) =>
    `${date.format('YYYY')}年${Math.ceil(Number(date.format('MM')) / 3)}Q`;
  const unit = year ? 'month' : 'quarter';

  const starts = target.map((post) => post.date.clone().startOf(unit));
  let first = starts[0].clone();
  let last = starts[0].clone();
  starts.forEach((at) => {
    if (at.isBefore(first)) first = at.clone();
    if (at.isAfter(last)) last = at.clone();
  });

  const counts = new Map();
  starts.forEach((at) => {
    const i = at.diff(first, unit);
    counts.set(i, (counts.get(i) || 0) + 1);
  });

  const series = [];
  for (let i = 0; i <= last.diff(first, unit); i++) {
    const at = first.clone().add(i, unit);
    series.push({ groupKey: year ? at.format('M月') : quarterOf(at), count: counts.get(i) || 0 });
  }
  return series;
};

// 積み上げの内訳データ。年ページは月の棒を週で、全期間は四半期の棒を月で割る。
//
// 年ページの週は「その月の何日目か」で決める（1〜7日 = 第1週）。ISO週にすると
// 月をまたぐ週が出て、棒の合計が月の投稿数と合わなくなる
hexo.extend.helper.register('posts_stack_series', function (year) {
  const buckets = generatePostsSeries(this.site.posts, year).map((e) => e.groupKey);
  const index = new Map(buckets.map((b, i) => [b, i]));

  const quarterOf = (date) =>
    `${date.format('YYYY')}年${Math.ceil(Number(date.format('MM')) / 3)}Q`;
  const slotCount = year ? 5 : 3;
  const labels = year
    ? Array.from({ length: 5 }, (_, i) => `第${i + 1}週`)
    : ['1か月目', '2か月目', '3か月目'];

  const slots = Array.from({ length: slotCount }, () => buckets.map(() => 0));
  const target = year
    ? this.site.posts.filter((post) => post.date.format('YYYY') === year.toString())
    : this.site.posts;

  target.forEach((post) => {
    const key = year ? post.date.format('M月') : quarterOf(post.date);
    const i = index.get(key);
    if (i === undefined) return;
    const slot = year
      ? Math.min(slotCount, Math.ceil(Number(post.date.format('D')) / 7)) - 1
      : (Number(post.date.format('MM')) - 1) % 3;
    slots[slot][i]++;
  });

  return JSON.stringify({ buckets, labels, slots });
});
