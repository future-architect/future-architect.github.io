'use strict';

const path = require('path');

/**
 * 見出し横のアンカー（headerlink）を仕上げるフィルター。
 *
 * hexo-renderer-marked は見出しに
 *   <a href="#id" class="headerlink" title="見出し"></a>
 * という中身が空のリンクを差し込む。ここで2つ足す。
 *
 * 1. aria-label。title 属性だけではスクリーンリーダーにも Lighthouse の
 *    link-name 監査にもリンク名として認識されない
 * 2. リンクのアイコンと、見出しの末尾への移動 (#2736)。中身が空だと
 *    幅0でホバーもクリックもできないため、目印を入れて押せるようにする。
 *    末尾に置くのは、左に出すと幅375pxで画面外にはみ出すため
 *    （見出しの左にある余白は .container 12px ＋ .col 12px の相殺で実効12px）
 *
 * 記事本文だけでなくテーマのテンプレートや reference_posts.js も同じ形の
 * headerlink を出力するので、ページ全体のHTMLに対して一括で処理する。
 */

// 見出しの先頭に差し込まれたアンカーと、その後ろの見出し文。
// h1〜h6 は入れ子にならないので、最短一致で閉じタグまで取れる
const HEADING_WITH_ANCHOR =
  /<(h[1-6])([^>]*)>(<a href="#[^"]*" class="headerlink"[^>]*><\/a>)([\s\S]*?)<\/\1>/g;

let iconPromise;

// 絵柄は svg-icon.ejs の辞書が1箇所で持つ決まりなので、パスを書き写さず
// partial を描いて使う（popular_posts.js が this.partial でやっているのと同じ #2681）
function linkIcon() {
  if (!iconPromise) {
    iconPromise = hexo.render
      .render(
        { path: path.join(hexo.theme_dir, 'layout/_partial/svg-icon.ejs') },
        { icon: 'link', class_name: 'svg-icon-trailing' },
      )
      .then((html) => html.trim());
  }
  return iconPromise;
}

hexo.extend.filter.register('after_render:html', async function (str) {
  const icon = await linkIcon();
  return str
    .replace(
      /<a href="(#[^"]*)" class="headerlink" title="([^"]*)"><\/a>/g,
      (match, href, title) => {
        if (!title) {
          return match; // 名前の元になる文字列がなければ触らない
        }
        return `<a href="${href}" class="headerlink" title="${title}" aria-label="${title} へのリンク"></a>`;
      },
    )
    .replace(
      HEADING_WITH_ANCHOR,
      (match, tag, attrs, anchor, text) =>
        `<${tag}${attrs}>${text}${anchor.slice(0, -'</a>'.length)}${icon}</a></${tag}>`,
    );
});
