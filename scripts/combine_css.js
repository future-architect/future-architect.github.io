'use strict';

const path = require('path');
const fs = require('hexo-fs');
const fsNode = require('fs');
const crypto = require('crypto');

// CSS の URL に付ける内容ハッシュ。URL が /css/site.css 固定だと、
// スタイルを変えてもブラウザがキャッシュを返し続けて反映されない。
// 連結元の3ファイルから計算するので、ビルドごとに変わらず決定的
const CSS_SOURCES = ['css-src/bootstrap-subset.css', 'metronic-src/assets/style.css', 'css-src/theme-styles.styl'];
hexo.extend.helper.register('css_version', function() {
  const src = CSS_SOURCES.map(p => fsNode.readFileSync(path.join(hexo.theme_dir, p))).join('\n');
  return crypto.createHash('md5').update(src).digest('hex').slice(0, 8);
});

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
 *
 * 元ファイルは themes/future/source/ の外（css-src / metronic-src）に置いている。
 * source/ 配下だと Hexo が public/ にそのまま複製してしまい、
 * 参照されない CSS が配信されるため。
 */
hexo.extend.generator.register('site_css', async function() {
  const themeDir = this.theme_dir;

  const bootstrap = await fs.readFile(path.join(themeDir, 'css-src/bootstrap-subset.css'));
  const metronic = await fs.readFile(path.join(themeDir, 'metronic-src/assets/style.css'));

  // theme-styles.styl は Stylus なので、ここで描画してから連結する
  const themeStyles = await this.render.render({
    path: path.join(themeDir, 'css-src/theme-styles.styl'),
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
