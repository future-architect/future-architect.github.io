'use strict';

const {postListItem} = require('./lib/post_list');

hexo.extend.helper.register('list_reference_posts', function() {

  const referencePosts = this.site.posts.data
    .filter(p => p.content.includes(this.post.path))
    .filter(p => p.path !== this.post.path) // その記事で自分がセルフリンクされている場合は除去
    // site.posts.data は日付順に並んでいない。以前は reverse() を掛けるだけで
    // 順序が不定のまま先頭5件を出しており、「新しい5件」ですら無かった。
    // 新しい順に並べて、参照の広がりを新しいものから辿れるようにする
    .sort((a, b) => b.date.valueOf() - a.date.valueOf());

  if (referencePosts.length === 0) {
    return "";
  }

  // 件数で打ち切らない。参照されていることは記事が積み上げてきた事実で、
  // 隠すと「参照しても表示されないなら書かなくてよい」という方向に働きうる。
  // 実データでは被参照が6件以上の記事は70本（5.7%）、最大でも29件のため、
  // 全件出してもページが極端に伸びることはない
  let result = "";
  for (const post of referencePosts) {
    // マークアップは lib/post_list.js に集約している
    result += postListItem(post, 'reference-posts-item');
  }

  return `
  <div class="card">
    <div id="reference" class="reference-lede"><a href="#reference" class="headerlink" title="参照されている記事"></a>この記事を参照している記事</div>
    <ul class="reference-post-link">${result}</ul>
  </div>`;
});
