'use strict';

const maxCount = 6;
const {getSNSCnt} = require('./lib/sns');

hexo.extend.helper.register('list_related_posts', function() {
  const post = this.post;
  if (!post.tags || !post.categories) {
    return `<p class="related-posts-none">No related post.</p>`;
  }

  // 1. 全著者数を取得し、著者のIDFを計算
  const allPostsCount = this.site.posts.length;
  const authors = [...new Set(this.site.posts.data.map(p => p.author))];
  const authorIDF = {};
  authors.forEach(author => {
    const postCountByAuthor = this.site.posts.data.filter(p => p.author === author).length;
    authorIDF[author] = Math.log(allPostsCount / postCountByAuthor);
  });

  // 2. 関連度スコアリング (タグと著者のIDFを考慮)
  const tagRelatedPosts = post.tags.data
    .flatMap(tag => tag.posts.data)
    .filter(p => p._id !== post._id);

  if (tagRelatedPosts.length === 0) {
    // タグ関連記事がなければカテゴリから補填するロジックに直接進む
    return getCategoryRelatedPosts(this, post);
  }

  const tagIDF = {};
  post.tags.data.forEach(tag => {
    tagIDF[tag.name] = Math.log(allPostsCount / tag.posts.length);
  });

  const relatedPosts = tagRelatedPosts.reduce((acc, p) => {
    let score = 0;

    p.tags.data.forEach(tag => {
      if (tagIDF[tag.name]) {
        score += tagIDF[tag.name];
      }
    });

    if (p.author === post.author) {
      score += authorIDF[p.author];
    }

    const existingPostIndex = acc.findIndex(item => item._id === p._id);
    if (existingPostIndex !== -1) {
      acc[existingPostIndex].score += score;
    } else {
      acc.push({ ...p, score: score });
    }
    return acc;
  }, []);

  // 3. 関連度スコアでソートし、同スコアの場合は日付でソート
  relatedPosts.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score; // スコアが異なる場合はスコアでソート
    } else {
      return b.date.valueOf() - a.date.valueOf(); // スコアが同じ場合は日付でソート
    }
  });

  // 4. 記事数がmaxCountに満たない場合はカテゴリから補填
  if (relatedPosts.length < maxCount) {
    // 補填された記事はスコアを持たないため、既存のリストにそのまま追加
    const postsToFill = getCategoryRelatedPosts(this, post);
    postsToFill.forEach(p => {
      if(relatedPosts.findIndex(rp => rp._id === p._id) === -1) {
        relatedPosts.push(p);
      }
    });
  }

  // 最終的な記事リストのHTML生成
  const count = Math.min(maxCount, relatedPosts.length);
  if (count === 0) {
    return `<p class="related-posts-none">No related post.</p>`;
  }

  const currentTime = new Date();
  const pastDate = currentTime.getDate() - 30;
  currentTime.setDate(pastDate);
  const label = p => currentTime.toISOString() <= p.date.toISOString() ? `<span class="newitem">NEW</span>` : "";

  let result = "";
  for (let i = 0; i < count; i++) {
    const related = relatedPosts[i];
    if (related) {
      const scoreText = related.score ? `スコア: ${related.score.toFixed(4)}` : '';
      const titleAttr = `${related.lede} ${scoreText}`.trim();
      result += `<li class="related-posts-item"><span>${related.date.format('YYYY.MM.DD')}</span><span class="snscount">&#9825;${getSNSCnt(related.permalink)}</span><a href=/${related.path} title="${titleAttr}">${related.title}${label(related)}</a></li>`;
    }
  }

  return `
    <div class="widget">
      <ul class="nav related-post-link">${result}</ul>
    </div>`;
});

// カテゴリからの補填ロジックを別関数に切り出す
function getCategoryRelatedPosts(ctx, post) {
  const currentCategory = post.categories.data[0];
  if (!currentCategory) {
    return [];
  }

  const categoryPosts = currentCategory.posts.data
    .filter(p => p._id !== post._id);

  categoryPosts.sort((a, b) => {
    const snsA = getSNSCnt(a.permalink);
    const snsB = getSNSCnt(b.permalink);
    if (snsA !== snsB) {
      return snsB - snsA;
    } else {
      return b.date.valueOf() - a.date.valueOf();
    }
  });

  return categoryPosts;
}

function objectArrayIndexOf(array, id) {
  for(let i = 0; i < array.length; i++){
    if (array[i]._id === id) return i;
  }
  return -1;
}
