'use strict';

/**
 * カテゴリの過半数を1つのタグが占めると、それ以外の記事に辿り着けない。
 * Programming は 337本中 201本（60%）が Go で、「Go 以外の Programming」を
 * 探す手段が無かった。そのタグを除いた一覧を1本だけ生成する。
 *
 * 「そのタグで絞り込む」側は作らない。/tags/Go/ と同義になるため。
 */

const pagination = require('hexo-pagination');
const { dominantTag } = require('./lib/dominant_tag');

hexo.extend.generator.register('category_without_tag', function (locals) {
  const perPage = (this.config.category_generator || {}).per_page || this.config.per_page || 10;
  const pages = [];

  locals.categories.forEach((category) => {
    const dominant = dominantTag(category);
    if (!dominant) return;

    const rest = dominant.rest.sort('-date');
    pages.push(
      ...pagination(category.path + dominant.slug, rest, {
        layout: ['category-without', 'archive', 'index'],
        perPage,
        data: {
          category: category.name,
          excludedTag: dominant.name,
          withoutPosts: rest,
          withoutPath: category.path + dominant.slug + '/',
        },
      }),
    );
  });

  return pages;
});

// カテゴリページと「◯◯ 以外の記事」のページで、一覧の見出しに2択を出すのに使う
hexo.extend.helper.register('category_without_tag', function (name) {
  const category = this.site.categories.findOne({ name });
  if (!category) return null;
  const dominant = dominantTag(category);
  if (!dominant) return null;
  return {
    name: dominant.name,
    count: dominant.rest.length,
    path: category.path + dominant.slug + '/',
    total: category.length,
    categoryPath: category.path,
  };
});

// 一覧の見出しに置く2択（すべて / ◯◯以外）。selected は 'all' か 'without'
hexo.extend.helper.register('category_filter', function (name, selected) {
  const without = this.category_without_tag(name);
  if (!without) return null;
  return [
    { label: 'すべて', count: without.total, url: without.categoryPath, current: selected === 'all' },
    { label: `${without.name}以外`, count: without.count, url: without.path, current: selected === 'without' },
  ];
});
