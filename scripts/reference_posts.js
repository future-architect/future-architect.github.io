'use strict';

hexo.extend.helper.register('list_reference_posts', function() {

  const referencePosts = this.site.posts.data.filter(p => p.content.includes(this.post.path))
    .filter(p => p.path !== this.post.path).reverse();; // その記事で自分セルフリンクされている場合は除去

  if (referencePosts.length == 0) {
    return "";
  }

  const currentTime = new Date();
  const pastDate = currentTime.getDate() - 30; // 4week
  currentTime.setDate(pastDate);

  const label = post => {
    if (currentTime.toISOString() <= post.date.toISOString()) {
      return `<span class="newitem">NEW</span>`;
    }
    return "";
  }


  let result = "";
  for (let i = 0; i < Math.min(5, referencePosts.length); i++) {
    const related = referencePosts[i];
    result += `<li class="reference-posts-item"><a href=/${related.path} title="${related.lede}">${related.title}${label(related)}</a></li>`;
  }

  return `
  <div class="card">
    <div id="reference" class="reference-lede"><a href="#reference" class="headerlink" title="参照されている記事"></a>この記事を参照している記事</div>
    <ul class="reference-post-link">${result}</ul>
  </div>`;
});
