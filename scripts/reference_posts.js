'use strict';

const {postListItem} = require('./lib/post_list');

hexo.extend.helper.register('list_reference_posts', function() {

  const referencePosts = this.site.posts.data.filter(p => p.content.includes(this.post.path))
    .filter(p => p.path !== this.post.path).reverse();; // その記事で自分セルフリンクされている場合は除去

  if (referencePosts.length == 0) {
    return "";
  }

  let result = "";
  for (let i = 0; i < Math.min(5, referencePosts.length); i++) {
    // マークアップは lib/post_list.js に集約している
    result += postListItem(referencePosts[i], 'reference-posts-item');
  }

  return `
  <div class="card">
    <div id="reference" class="reference-lede"><a href="#reference" class="headerlink" title="参照されている記事"></a>この記事を参照している記事</div>
    <ul class="reference-post-link">${result}</ul>
  </div>`;
});
