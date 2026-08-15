// CSS だけを public/css/site.css に書き出す開発用スクリプト（make css）。
//
// hexo generate は何も変えていなくても1分半以上かかる（記事1,449本ぶんの
// 処理が毎回走るため。書き出し0ファイルでも同じ）。CSS の見た目を確かめる
// だけならページの再生成は要らないので、連結済みの CSS を直接置き換える。
//
// 連結の順序と内容は scripts/combine_css.js と同じにすること。
// あちらが公開ビルドの正で、ここはその写し。順序を変えると表示が壊れる。
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const stylus = require('stylus');

const root = dirname(fileURLToPath(import.meta.url));
const themeDir = join(root, 'themes/future');
const stylPath = join(themeDir, 'css-src/theme-styles.styl');

stylus.render(readFileSync(stylPath, 'utf8'), { filename: stylPath }, (err, css) => {
  if (err) {
    console.error(err.message);
    process.exit(1);
  }
  const combined = [
    '/* bootstrap-subset.css */',
    readFileSync(join(themeDir, 'css-src/bootstrap-subset.css'), 'utf8'),
    '/* metronic/assets/style.css */',
    readFileSync(join(themeDir, 'metronic-src/assets/style.css'), 'utf8'),
    '/* theme-styles.styl */',
    css,
  ].join('\n');

  const out = join(root, 'public/css/site.css');
  writeFileSync(out, combined);
  console.log(`${out} (${Math.round(combined.length / 1024)}KB)`);
});
