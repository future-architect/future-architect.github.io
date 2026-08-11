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

// カテゴリページから「◯◯ 以外の記事」への導線を出すのに使う
hexo.extend.helper.register('category_without_tag', function (name) {
  const category = this.site.categories.findOne({ name });
  if (!category) return null;
  const dominant = dominantTag(category);
  if (!dominant) return null;
  return {
    name: dominant.name,
    count: dominant.rest.length,
    path: category.path + dominant.slug + '/',
  };
});
