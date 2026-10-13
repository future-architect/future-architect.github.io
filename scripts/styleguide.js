'use strict';

const fs = require('fs');
const path = require('path');
const { fillStyleguide } = require('./lib/styleguide_values');

// 毎ビルド走る after_render:html で書き込む。after_post_render は描画結果が
// db.json に残るので、トークンだけ変えたときにページが古い値のまま残る
hexo.extend.filter.register('after_render:html', function (str) {
  if (!str.includes('class="sg-hex ')) return str;
  const css = fs.readFileSync(path.join(hexo.theme_dir, 'css-src/tokens.css'), 'utf8');
  return fillStyleguide(str, css);
});
