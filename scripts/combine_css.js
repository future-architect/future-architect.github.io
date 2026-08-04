'use strict';

const path = require('path');
const fs = require('hexo-fs');

/**
 * CSS を1ファイルにまとめて配信するジェネレータ。
 *
 * 以前は bootstrap-subset.css / metronic の style.css / theme-styles.css の
 * 3ファイルを読み込んでおり、いずれもレンダリングブロッキングだった。
 * Lighthouse でも「レンダリングをブロックしているリクエスト」として
 * 約290msの削減余地が指摘されていた。
 *
 * 読み込み順は従来の head.ejs と同じ（Bootstrap → metronic → テーマ）。
 * CSS は後勝ちなので、この順序を変えると表示が壊れる。
 */
hexo.extend.generator.register('site_css', async function() {
  const themeDir = this.theme_dir;

  const bootstrap = await fs.readFile(path.join(themeDir, 'source/css/bootstrap-subset.css'));
  const metronic = await fs.readFile(path.join(themeDir, 'source/metronic/assets/style.css'));

  // theme-styles.styl は Stylus なので、ここで描画してから連結する
  const themeStyles = await this.render.render({
    path: path.join(themeDir, 'source/css/theme-styles.styl'),
    engine: 'styl'
  });

  const combined = [
    '/* bootstrap-subset.css */',
    bootstrap,
    '/* metronic/assets/style.css */',
    metronic,
    '/* theme-styles.styl */',
    themeStyles
  ].join('\n');

  return {
    path: 'css/site.css',
    data: combined
  };
});
