'use strict';

const pagination = require('hexo-pagination');

hexo.extend.generator.register('categories', function (locals) {
  // ページ生成に1件必要なだけのダミー。並べてから取らないと OGP 画像が実行ごとに変わる
  return pagination('categories', locals.posts.sort('-date').slice(0, 1), {
    layout: ['categories', 'archive', 'index'],
  });
});

hexo.extend.helper.register('count_categories', function () {
  return this.site.categories
    .map((category) => category.name)
    .flat()
    .unique().length;
});

// 検索窓のパネル（#2791）用。全ページのヘッダーから呼ぶので結果を持ち回る。
// 記事数が変わったら作り直すため、server での編集にも追随する
const activeCategoriesCache = new Map();

// 直近 months ヶ月に投稿のあるカテゴリだけを、累計本数の多い順に返す。
// 全件だと数年止まっているカテゴリが入口として並ぶ。件数は累計のまま
// （そのカテゴリの規模を示す数字で、サイドバー・/categories/ と揃える）
hexo.extend.helper.register('active_categories', function (months = 6) {
  const cacheKey = `${months}:${this.site.posts.length}`;
  if (activeCategoriesCache.has(cacheKey)) return activeCategoriesCache.get(cacheKey);
  const since = Date.now() - months * 30 * 24 * 60 * 60 * 1000;
  const categories = this.site.categories
    .toArray()
    .filter((c) => c.posts.toArray().some((p) => p.date.valueOf() >= since))
    .map((c) => ({ name: c.name, path: c.path, count: c.length }))
    // 同点は名前で決める（決着が無いとビルドごとに並びが変わる）
    .sort((a, b) => b.count - a.count || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  activeCategoriesCache.set(cacheKey, categories);
  return categories;
});
