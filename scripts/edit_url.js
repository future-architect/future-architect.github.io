'use strict';

// 記事の原稿を GitHub の編集画面で開く URL。記事タイトルの鉛筆マークと
// フッターの誤字報告が同じ行き先を指すので、組み立てはここ1箇所に置く (#2839)。
// encodeURIComponent なので区切りの / も %2F になる（GitHub はこの形を受け取る）
const REPO = 'https://github.com/future-architect/future-architect.github.io';

hexo.extend.helper.register(
  'edit_url',
  (source) => `${REPO}/edit/main/source/${encodeURIComponent(source)}`,
);
