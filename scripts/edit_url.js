'use strict';

// 原稿を GitHub の編集画面で開く URL。記事タイトルの鉛筆・フッターの誤字報告・
// 特設ページ・著者プロフィールが同じ行き先を指すので、組み立てはここ1箇所に置く (#2839)。
// パスはリポジトリ相対。区切りの / は残し、要素だけを encode する（日本語のファイル名がある）
const REPO = 'https://github.com/future-architect/future-architect.github.io';

const editUrl = (p) =>
  `${REPO}/edit/main/${String(p).split('/').map(encodeURIComponent).join('/')}`;

hexo.extend.helper.register('edit_url', editUrl);

/**
 * そのページの原稿の編集画面 (#3186)。無ければ null。
 *
 * 記事は自分の原稿。特設ページは frontmatter の editable が名乗る——
 * 直す対象が決まらないページ（一覧・ナビゲーター）に出しても行き止まりになる。
 * **中身がテンプレートにあるページは edit_path で行き先を上書きする。**
 * 部品ギャラリーの原稿は5行の stub で、読者が直したい文はテンプレートの側にある
 */
hexo.extend.helper.register('page_edit_url', function () {
  const page = this.page || {};
  if (page.layout === 'post') return editUrl('source/' + page.source);
  if (page.edit_path) return editUrl(page.edit_path);
  if (page.editable && page.source) return editUrl('source/' + page.source);
  return null;
});
