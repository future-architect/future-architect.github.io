'use strict';

// 年ページの上限は 15 固定。平日しか公開せず2週で束ねるので机上10程度に収まる。
// 1日2本出していた時期の山は上にはみ出して切れて良い
hexo.extend.helper.register('max_posts', function(year) {
  if (year) return 15;
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

// 年ページは2週単位、全期間は四半期単位で数える。
// 年を月で切ると12本しか立たず、全期間の四半期と粒度が変わらなかった。
// 週だと細かすぎたので2週で合算する（#2121）。
//
// 投稿が無い期間も 0 で埋める。記事のある期間だけを並べると、
// 間隔が詰まって「毎週出ている」ように見えてしまう
const generatePostsSeries = (posts, year) => {
  const target = year
    ? posts.filter(post => post.date.format('YYYY') === year.toString())
    : posts;

  const quarterOf = date => `${date.format('YYYY')}年${Math.ceil(Number(date.format('MM')) / 3)}Q`;
  const bucketOf = date => (year ? date.clone().startOf('isoWeek') : date.clone().startOf('quarter'));

  const starts = target.map(post => bucketOf(post.date));
  if (starts.length === 0) return [];
  let first = starts[0].clone();
  let last = starts[0].clone();
  starts.forEach(at => {
    if (at.isBefore(first)) first = at.clone();
    if (at.isAfter(last)) last = at.clone();
  });

  // 2週ごとに合算するので、最初の週からの経過週で束ねる
  const step = year ? 2 : 1;
  const unit = year ? 'week' : 'quarter';
  const indexOf = at => Math.floor(at.diff(first, unit) / step);

  const counts = new Map();
  starts.forEach(at => {
    const i = indexOf(at);
    counts.set(i, (counts.get(i) || 0) + 1);
  });

  const series = [];
  for (let i = 0; i <= indexOf(last); i++) {
    const at = first.clone().add(i * step, unit);
    series.push({groupKey: year ? at.format('MM/DD') : quarterOf(at), count: counts.get(i) || 0});
  }
  return series;
}
