'use strict';

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

  // 年ページは1月から（今年は現在の月まで、過去の年は12月まで）を必ず並べる。
  // 投稿のある月だけにすると、月が抜けて期間が詰まって見えるうえ、
  // 同じページの「カテゴリ別」タブと軸の長さが食い違う (#2430)
  if (year) {
    const now = new Date();
    const monthCount = Number(year) === now.getFullYear() ? now.getMonth() + 1 : 12;
    const counts = new Array(monthCount).fill(0);
    target.forEach((post) => {
      const m = post.date.month();
      if (m < monthCount) counts[m]++;
    });
    return counts.map((count, i) => ({ groupKey: `${i + 1}月`, count }));
  }

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

// 全期間ページの「年別」タブ (#2757)。月を横軸に、年ごとの折れ線を重ねる。
// 「4月が山」「12月が落ちる」のような年をまたいだ月の傾向と、
// 今年が去年に比べて多いか少ないかを1枚で見るためのもの。
//
// 出すのは直近5年で、初期表示は直近3年（残りは凡例で足す）。11年すべてを
// 重ねると、月1〜2本だった2016〜2018年の平坦な線が読み取りの邪魔になる。
const YEAR_OVERLAY_SPAN = 5;
const YEAR_OVERLAY_SHOWN = 3;

hexo.extend.helper.register('posts_year_overlay_series', function () {
  const counts = new Map(); // 'YYYY-M' -> 本数
  let latest = null;
  let earliest = null;
  this.site.posts.forEach((post) => {
    const y = post.date.year();
    const key = `${y}-${post.date.month() + 1}`;
    counts.set(key, (counts.get(key) || 0) + 1);
    if (latest === null || y > latest) latest = y;
    if (earliest === null || y < earliest) earliest = y;
  });
  if (latest === null) return JSON.stringify({ months: [], series: [], selected: {} });

  const years = Array.from({ length: YEAR_OVERLAY_SPAN }, (_, i) => latest - i).filter(
    (y) => y >= earliest,
  );
  // まだ来ていない月は 0 ではなく null にして線を切る。0 を描くと投稿が
  // 急に止まったように見える。過去の月の 0 は実際に投稿が無かった月なので残す
  const nowY = new Date().getFullYear();
  const nowM = new Date().getMonth() + 1;
  const monthCount = (y) => (y === nowY ? nowM : 12);

  const series = years.map((y) => ({
    name: `${y}年`,
    data: Array.from({ length: 12 }, (_, i) =>
      i + 1 <= monthCount(y) ? counts.get(`${y}-${i + 1}`) || 0 : null,
    ),
  }));
  const selected = {};
  years.forEach((y, i) => {
    selected[`${y}年`] = i < YEAR_OVERLAY_SHOWN;
  });

  return JSON.stringify({
    months: Array.from({ length: 12 }, (_, i) => `${i + 1}月`),
    series,
    selected,
  });
});

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
