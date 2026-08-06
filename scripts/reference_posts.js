'use strict';

const {getSNSCnt} = require('./lib/sns');

// 反響が0のときは何も出さない（related_posts.js と揃える）
const snsLabel = permalink => {
  const n = getSNSCnt(permalink);
  return n > 0 ? `<span class="snscount">&#9825;${n}</span>` : '';
};

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
    // 関連記事（related_posts.js）とマークアップを揃える
    result += `<li class="reference-posts-item"><a href=/${related.path} title="${related.lede}">${related.title}</a>${label(related)}<span class="post-meta"><span class="post-meta-date">${related.date.format('YYYY.MM.DD')}</span>${snsLabel(related.permalink)}</span></li>`;
  }

  return `
  <div class="card">
    <div id="reference" class="reference-lede"><a href="#reference" class="headerlink" title="参照されている記事"></a>この記事を参照している記事</div>
    <ul class="reference-post-link">${result}</ul>
  </div>`;
});
