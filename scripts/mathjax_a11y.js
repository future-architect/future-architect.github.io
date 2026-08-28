'use strict';

/**
 * 数式に代替テキストを与えるフィルター (#2927)。
 *
 * hexo-filter-mathjax は MathJax の SVG 出力しか持たず、出てくる
 * <svg role="img"> は title も aria-label も持たない。代替テキストを出す設定も
 * 公開していない（extension_options は TeX 入力側にしか渡らない）ため、
 * 数式が読み上げられない状態になっている。
 *
 * 同じ数式から MathML を作り、SVG の隣に .sr-only で置く。SVG は aria-hidden で
 * 読み上げから外す。MathJax がブラウザ側で既定にしている assistive MathML と
 * 同じ形で、見た目は変わらない。
 *
 * **見た目の SVG もここで描く**（プラグインの優先度5より前の4で走り、$ を消費するので
 * プラguin 側は素通りになる）。プラグインの出力に後から MathML を当てる形は採れない。
 * 文書順で対応づけるしかなく、区切り記号の対応が崩れた記事（`$` の迷子）では
 * findMath が見つける数と実際に出る mjx-container の数がずれて、
 * **別の式の読み上げを付けてしまう**。描画そのものを持てば、式と MathML は
 * 同じ item 経由で結び付く。
 */

const { mathjax } = require('mathjax-full/js/mathjax.js');
const { TeX } = require('mathjax-full/js/input/tex.js');
const { SVG } = require('mathjax-full/js/output/svg.js');
const { LiteAdaptor } = require('mathjax-full/js/adaptors/liteAdaptor.js');
const { RegisterHTMLHandler } = require('mathjax-full/js/handlers/html.js');
const { AllPackages } = require('mathjax-full/js/input/tex/AllPackages.js');
const { SerializedMmlVisitor } = require('mathjax-full/js/core/MmlTree/SerializedMmlVisitor.js');

// MathML は文字列でしか手に入らず、アダプタは要素しか足せない。いったん目印を
// 置いて直列化後に差し替える。目印は連番なので、式との対応は描画結果のまま保たれる
const MARK = (i) => `@@mathml-a11y-${i}@@`;

// プラグインと同じ設定で読む必要があるので、初期化は描画時まで遅らせる
// （hexo.config.mathjax の既定値はプラグインの読み込み時に入る）
let jax = null;
const setup = () => {
  if (jax) return jax;
  const config = hexo.config.mathjax || {};
  const adaptor = new LiteAdaptor({
    fontSize: 16,
    cjkCharWidth: config.cjk_width,
    unknownCharWidth: config.normal_width,
  });
  RegisterHTMLHandler(adaptor);
  const tex = new TeX(
    Object.assign(
      {
        packages: Array.isArray(config.packages)
          ? AllPackages.concat(config.packages)
          : AllPackages,
        tags: config.tags,
        inlineMath: config.single_dollars === false ? {} : { '[+]': [['$', '$']] },
      },
      config.extension_options,
    ),
  );
  jax = { adaptor, tex, visitor: new SerializedMmlVisitor() };
  return jax;
};

hexo.extend.filter.register(
  'after_post_render',
  (data) => {
    if (!data.mathjax && !(hexo.config.mathjax || {}).every_page) return;

    const { adaptor, tex, visitor } = setup();
    const doc = mathjax.document(data.content, {
      InputJax: tex,
      OutputJax: new SVG({ fontCache: 'none' }),
    });
    doc.render();

    const mathml = [];
    for (const item of doc.math) {
      const container = item.typesetRoot;
      const svg = container && adaptor.firstChild(container);
      // 何も出なかった式（`$` の迷子で拾われた空の領域）は container を持たない
      if (!svg || adaptor.kind(svg) !== 'svg') continue;

      adaptor.setAttribute(svg, 'aria-hidden', 'true');
      const label = adaptor.node('span', { class: 'sr-only' });
      adaptor.append(label, adaptor.text(MARK(mathml.length)));
      adaptor.append(container, label);
      // 改行を潰すのは、隠し要素の中で余分な空白を読み上げさせないため
      mathml.push(visitor.visitTree(item.root).replace(/\n\s*/g, ''));
    }
    if (mathml.length === 0) return;

    data.content = adaptor
      .innerHTML(adaptor.body(doc.document))
      .replace(/@@mathml-a11y-(\d+)@@/g, (_, i) => mathml[Number(i)]);
    return data;
  },
  4,
);
