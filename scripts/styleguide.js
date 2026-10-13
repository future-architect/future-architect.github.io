'use strict';

const path = require('path');
const { fillStyleguide } = require('./lib/styleguide_values');

// 毎ビルド走る after_render:html で書き込む。after_post_render は描画結果が
// db.json に残るので、トークンだけ変えたときにページが古い値のまま残る
hexo.extend.filter.register('after_render:html', async function (str) {
  if (!str.includes('class="sg-hex ')) return str;
  const css = await hexo.render.render({
    path: path.join(hexo.theme_dir, 'css-src/theme-styles.styl'),
    engine: 'styl',
  });
  return fillStyleguide(str, css);
});
