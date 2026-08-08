'use strict';

const pagination = require('hexo-pagination');

hexo.extend.generator.register("categories", function(locals) {
   // ページ生成に1件必要なだけのダミー。並べてから取らないと OGP 画像が実行ごとに変わる
   return  pagination('categories', locals.posts.sort('-date').slice(0, 1), {
        layout: ['categories', 'archive', 'index'],
    });
});

hexo.extend.helper.register('count_categories', function() {
  return this.site.categories.map(category => category.name).flat().unique().length;
});
