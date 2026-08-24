'use strict';

const path = require('path');
const fs = require('hexo-fs');
const fsNode = require('fs');
const crypto = require('crypto');
const { combineCss } = require('./lib/site_css');

// CSS の URL に付ける内容ハッシュ。URL が /css/site.css 固定だと、
// スタイルを変えてもブラウザがキャッシュを返し続けて反映されない。
// 連結元の3ファイルから計算するので、ビルドごとに変わらず決定的
const CSS_SOURCES = ['css-src/bootstrap-subset.css', 'css-src/theme-styles.styl'];
hexo.extend.helper.register('css_version', function () {
  const src = CSS_SOURCES.map((p) => fsNode.readFileSync(path.join(hexo.theme_dir, p))).join('\n');
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
 * 連結そのものは scripts/lib/site_css.js が持つ（make css と共用）。
 *
 * 元ファイルは themes/future/source/ の外（css-src）に置いている。
 * source/ 配下だと Hexo が public/ にそのまま複製してしまい、
 * 参照されない CSS が配信されるため。
 */
hexo.extend.generator.register('site_css', async function () {
  const themeDir = this.theme_dir;

  const bootstrap = await fs.readFile(path.join(themeDir, 'css-src/bootstrap-subset.css'));

  // theme-styles.styl は Stylus なので、ここで描画してから連結する
  const themeStyles = await this.render.render({
    path: path.join(themeDir, 'css-src/theme-styles.styl'),
    engine: 'styl',
  });

  return {
    path: 'css/site.css',
    data: combineCss({ bootstrap, themeStyles }),
  };
});
