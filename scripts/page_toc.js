'use strict';

/**
 * Markdown で書いた固定ページの目次 (#2559)。出す価値が無いときは空文字を返す。
 *
 * 「出すか出さないか」をここ1箇所で決める。サイドバーと本文前の折りたたみの
 * 両方が同じ目次を使うため、条件を呼び出し側それぞれに書くと片方だけ出る
 * 状態が作れてしまう。
 *
 * - h1 は外す（min_depth: 2）。Markdown のページの h1 はそのページの
 *   タイトルそのもの（#2577）で、目次に自分を載せる意味が無い
 * - 項目が1つのページでは出さない。「目次」という見出しの下に1行だけ並ぶ
 *   （/specials/ が h1 だけでこの状態だった）。見出しが増えれば自然に出る
 */
const MIN_ITEMS = 2;

hexo.extend.helper.register('page_toc', function (content) {
  if (!content) return '';
  const html = this.toc(content, { list_number: false, min_depth: 2, max_depth: 3 });
  return (html.match(/<li/g) || []).length >= MIN_ITEMS ? html : '';
});
