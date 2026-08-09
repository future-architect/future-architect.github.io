'use strict';

hexo.extend.helper.register('max_posts', function(year) {
  let defaultMax = 100;
  if (year) {
    defaultMax = 30;
  }

  const acc = generatePostsSeries(this.site.posts, year);
  return Math.max(defaultMax, Math.max(...acc.map(item => item.count)));
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

// 年ページは週単位、全期間は四半期単位で数える。
// 年を月で切ると12本しか立たず、全期間の四半期と粒度が変わらなかった（#2121）。
//
// 投稿が無い期間も 0 で埋める。記事のある期間だけを並べると、
// 間隔が詰まって「毎週出ている」ように見えてしまう
const generatePostsSeries = (posts, year) => {
  const target = year
    ? posts.filter(post => post.date.format('YYYY') === year.toString())
    : posts;

  const quarterOf = date => `${date.format('YYYY')}年${Math.ceil(Number(date.format('MM')) / 3)}Q`;
  const keyOf = date => (year ? date.clone().startOf('isoWeek').format('MM/DD') : quarterOf(date));

  const counts = new Map();
  let first = null;
  let last = null;
  target.forEach(post => {
    const key = keyOf(post.date);
    counts.set(key, (counts.get(key) || 0) + 1);
    const at = year ? post.date.clone().startOf('isoWeek') : post.date.clone().startOf('quarter');
    if (!first || at.isBefore(first)) first = at.clone();
    if (!last || at.isAfter(last)) last = at.clone();
  });
  if (!first) return [];

  const series = [];
  for (const at = first.clone(); !at.isAfter(last); at.add(1, year ? 'week' : 'quarter')) {
    const key = year ? at.format('MM/DD') : quarterOf(at);
    series.push({groupKey: key, count: counts.get(key) || 0});
  }
  return series;
}
