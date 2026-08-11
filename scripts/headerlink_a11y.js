'use strict';

/**
 * 見出し横のアンカー（headerlink）にアクセシブルな名前を与えるフィルター。
 *
 * hexo-renderer-marked は見出しに
 *   <a href="#id" class="headerlink" title="見出し"></a>
 * という中身が空のリンクを差し込む。title 属性だけではスクリーンリーダーにも
 * Lighthouse の link-name 監査にもリンク名として認識されないため、aria-label を補う。
 *
 * 記事本文だけでなくテーマのテンプレートや reference_posts.js も同じ形の
 * headerlink を出力するので、ページ全体のHTMLに対して一括で処理する。
 */
hexo.extend.filter.register('after_render:html', function (str) {
  return str.replace(
    /<a href="(#[^"]*)" class="headerlink" title="([^"]*)"><\/a>/g,
    (match, href, title) => {
      if (!title) {
        return match; // 名前の元になる文字列がなければ触らない
      }
      return `<a href="${href}" class="headerlink" title="${title}" aria-label="${title} へのリンク"></a>`;
    },
  );
});
