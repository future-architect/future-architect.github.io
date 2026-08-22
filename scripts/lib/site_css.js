'use strict';

/**
 * 配信する /css/site.css の組み立て。
 *
 * 公開ビルド（scripts/combine_css.js）と開発用の make css（css.mjs）の
 * 両方から呼ぶ。以前は同じ連結をそれぞれが持っていて、片方だけ直すと
 * 手元と本番で違う CSS を見ることになっていた。
 */

/**
 * コメントを落とす。設計判断を書いた日本語のコメントが連結後の半分を占めて
 * おり、そのぶんレンダリングを待たせている。
 *
 * 文字列リテラルは読み飛ばす。content: "/*" のような値をコメントの開始と
 * 見なすと、そこから次の閉じまでが丸ごと消える。
 */
function stripComments(css) {
  return css
    .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\*[\s\S]*?\*\//g, (m) =>
      m.startsWith('/*') ? '' : m,
    )
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{2,}/g, '\n');
}

/**
 * 読み込み順は従来の head.ejs と同じ（Bootstrap → metronic → テーマ）。
 * CSS は後勝ちなので、この順序を変えると表示が壊れる。
 */
function combineCss({ bootstrap, metronic, themeStyles }) {
  return [
    '/* bootstrap-subset.css */',
    stripComments(bootstrap),
    '/* metronic/assets/style.css */',
    stripComments(metronic),
    '/* theme-styles.styl */',
    stripComments(themeStyles),
  ].join('\n');
}

module.exports = { stripComments, combineCss };
