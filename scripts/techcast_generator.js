'use strict';

const pagination = require('hexo-pagination');

// Author Root Page
hexo.extend.generator.register('techcasts', function (locals) {
  // ページ生成に1件必要なだけのダミー。並べてから取らないと OGP 画像が実行ごとに変わる
  return pagination('techcasts', locals.posts.sort('-date').slice(0, 1), {
    layout: ['techcasts', 'archive', 'index'],
  });
});
