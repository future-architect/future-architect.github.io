'use strict';

const {postListItem} = require('./lib/post_list');
const {navLinkedPaths} = require('./lib/series');

hexo.extend.helper.register('list_reference_posts', function() {

  // 連載ナビが既に出している記事は落とす。すぐ上に同じ導線があるため
  const linked = navLinkedPaths(this.site, this.post);

  const referencePosts = this.site.posts.data
    .filter(p => p.content.includes(this.post.path))
    .filter(p => p.path !== this.post.path) // その記事で自分がセルフリンクされている場合は除去
    .filter(p => !linked.has(p.path))
    // site.posts.data は日付順に並んでいない。以前は reverse() を掛けるだけで
    // 順序が不定のまま先頭5件を出しており、「新しい5件」ですら無かった。
    // 新しい順に並べて、参照の広がりを新しいものから辿れるようにする
    .sort((a, b) => b.date.valueOf() - a.date.valueOf());

  if (referencePosts.length === 0) {
    return "";
  }

  // 件数で打ち切らない。参照されていることは記事が積み上げてきた事実で、
  // 隠すと「参照しても表示されないなら書かなくてよい」という方向に働きうる。
  //
  // ただし全件をそのまま並べると、最大32件の記事では記事末尾が長くなりすぎる。
  // 先頭だけ常に見せ、残りは details で畳んでクリックで開けるようにする。
  // details ならJSを足さずに済む。
  const VISIBLE = 5;
  // 残りが1件だけなら畳む意味がないので、そのまま出す
  const collapses = referencePosts.length > VISIBLE + 1;
  const shown = collapses ? referencePosts.slice(0, VISIBLE) : referencePosts;
  const hidden = collapses ? referencePosts.slice(VISIBLE) : [];

  // マークアップは lib/post_list.js に集約している
  const items = posts => posts.map(p => postListItem(p, 'reference-posts-item')).join('');

  // ul の直下に details は置けないため、畳む分は別の ul にして details で包む
  const more = hidden.length === 0 ? '' : `
    <details class="reference-post-more">
      <summary>残り ${hidden.length} 件を表示</summary>
      <ul class="reference-post-link">${items(hidden)}</ul>
    </details>`;

  return `
  <div class="card">
    <div id="reference" class="reference-lede"><a href="#reference" class="headerlink" title="参照されている記事"></a>この記事を参照している記事</div>
    <ul class="reference-post-link">${items(shown)}</ul>${more}
  </div>`;
});
