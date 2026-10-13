'use strict';

const path = require('path');
const fsNode = require('fs');
const crypto = require('crypto');
const { combineCss, CSS_FILES } = require('./lib/site_css');

// CSS の URL に付ける内容ハッシュ。URL が /css/site.css 固定だと、
// スタイルを変えてもブラウザがキャッシュを返し続けて反映されない。
// 連結元のファイルから計算するので、ビルドごとに変わらず決定的
hexo.extend.helper.register('css_version', function () {
  const src = CSS_FILES.map((name) =>
    fsNode.readFileSync(path.join(hexo.theme_dir, 'css-src', name)),
  ).join('\n');
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
hexo.extend.generator.register('site_css', function () {
  const srcDir = path.join(this.theme_dir, 'css-src');
  return {
    path: 'css/site.css',
    data: combineCss((name) => fsNode.readFileSync(path.join(srcDir, name), 'utf8')),
  };
});
