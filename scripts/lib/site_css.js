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
 * Bootstrap は @layer に入れ、テーマはレイヤーの外に置く。レイヤーの外の
 * 宣言は詳細度に関係なくレイヤーの中に勝つので、テーマが Bootstrap に
 * 勝つことを連結順と詳細度に頼らずに決められる (#3332)。
 * テーマまでレイヤーに入れない。レイヤーの外にある CSS（gist の埋め込み、
 * mermaid の SVG が持つ <style>）にテーマが負けるようになる。
 * サイトの土台（旧 metronic-src/assets/style.css）は theme-styles.styl の
 * 先頭に畳んである (#2759)。
 */
function combineCss({ bootstrap, themeStyles }) {
  return [
    '/* bootstrap-subset.css */',
    `@layer bootstrap {\n${stripComments(bootstrap)}\n}`,
    '/* theme-styles.styl */',
    stripComments(themeStyles),
  ].join('\n');
}

module.exports = { stripComments, combineCss };
