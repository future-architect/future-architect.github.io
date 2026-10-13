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
 * 連結の順。素の CSS をつなぐだけで、変換は挟まない (#3340)。
 *
 * Bootstrap は @layer に入れ、テーマはレイヤーの外に置く。レイヤーの外の
 * 宣言は詳細度に関係なくレイヤーの中に勝つので、テーマが Bootstrap に
 * 勝つことを連結順と詳細度に頼らずに決められる (#3332)。
 * テーマまでレイヤーに入れない。レイヤーの外にある CSS（gist の埋め込み、
 * mermaid の SVG が持つ <style>）にテーマが負けるようになる。
 *
 * テーマの中は後勝ち。tokens.css は :root の宣言だけなので位置を問わない。
 * highlight.css は theme-styles.css より前。以前は theme-styles の途中で読み込んでいて、
 * その後ろの規則が後から勝つ前提で書かれている（末尾に回すと本文の高さが変わる）
 */
const BOOTSTRAP = 'bootstrap-subset.css';
const THEME = ['tokens.css', 'highlight.css', 'theme-styles.css'];
const CSS_FILES = [BOOTSTRAP, ...THEME];

function combineCss(read) {
  return [
    `/* ${BOOTSTRAP} */`,
    `@layer bootstrap {\n${stripComments(read(BOOTSTRAP))}\n}`,
    ...THEME.flatMap((name) => [`/* ${name} */`, stripComments(read(name))]),
  ].join('\n');
}

module.exports = { stripComments, combineCss, CSS_FILES };
