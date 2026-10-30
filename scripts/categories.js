'use strict';

const pagination = require('hexo-pagination');

hexo.extend.generator.register('categories', function (locals) {
  // ページ生成に1件必要なだけのダミー。並べてから取らないと OGP 画像が実行ごとに変わる
  return pagination('categories', locals.posts.sort('-date').slice(0, 1), {
    layout: ['categories', 'archive', 'index'],
  });
});

// 略語のカテゴリの正式名称（source/_data/category_full_names.yml #3409）。無ければ空文字
function categoryFullName(site, name) {
  const names = site.data && site.data.category_full_names;
  return (names && names[name]) || '';
}

hexo.extend.helper.register('category_full_name', function (name) {
  return categoryFullName(this.site, name);
});

// title 属性用の名前。表示は略語のままにして行の幅を変えないので、正式名称は title だけが持つ
hexo.extend.helper.register('category_label', function (name) {
  const full = categoryFullName(this.site, name);
  return full ? `${name}（${full}）` : name;
});
