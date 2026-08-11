'use strict';

// 年・月ページの前後の期間 (#2228)。投稿の無い期間はページ自体が
// 生成されないため、隣接ではなく投稿のある直近の期間を返す。
// 月は年をまたぐ（2019年12月の次は2020年1月）
hexo.extend.helper.register('period_nav', function (year, month) {
  const monthly = month !== undefined && month !== null;
  const fmt = monthly ? 'YYYYMM' : 'YYYY';
  const keys = [...new Set(this.site.posts.map((p) => p.date.format(fmt)))].sort();
  const current = monthly ? year.toString() + month.toString().padStart(2, '0') : year.toString();
  const at = keys.indexOf(current);
  if (at < 0) return { prev: null, next: null };
  const entry = (key) => {
    if (key === undefined) return null;
    const y = key.slice(0, 4);
    if (!monthly) return { label: `${y}年`, path: `articles/${y}/` };
    const m = key.slice(4, 6);
    return { label: `${y}年${Number(m)}月`, path: `articles/${y}/${m}/` };
  };
  return { prev: entry(keys[at - 1]), next: entry(keys[at + 1]) };
});
