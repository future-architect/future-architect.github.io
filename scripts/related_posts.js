'use strict';

// 関連記事の最大表示件数
// 記事が長文化する傾向にあるため、記事末尾のスクロール量を抑える目的で絞っている
const maxCount = 3;
const {getSNSCnt} = require('./lib/sns');

// HTMLを生成するロジックを共通関数として外に切り出す
function generateRelatedPostsHtml(posts) {
  const count = Math.min(maxCount, posts.length);
  if (count === 0) {
    return `<p class="related-posts-none">No related post.</p>`;
  }

  const currentTime = new Date();
  const pastDate = currentTime.getDate() - 30;
  currentTime.setDate(pastDate);
  const label = p => currentTime.toISOString() <= p.date.toISOString() ? `<span class="newitem">NEW</span>` : "";

  let result = "";
  for (let i = 0; i < count; i++) {
    const related = posts[i];
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
}

// 「この記事を参照している記事」（reference_posts.js）に出る記事のID
// 同じ記事が関連記事にも並ばないよう、除外するために使う
function getReferencePostIds(ctx, post) {
  return new Set(ctx.site.posts.data
    .filter(p => p.path !== post.path && p.content.includes(post.path))
    .map(p => p._id));
}

// カテゴリから関連記事を取得する関数（変更なし）
function getCategoryRelatedPosts(ctx, post, excludeIds) {
  const currentCategory = post.categories.data[0];
  if (!currentCategory) {
    return [];
  }

  const categoryPosts = currentCategory.posts.data
    .filter(p => p._id !== post._id && !excludeIds.has(p._id));

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


hexo.extend.helper.register('list_related_posts', function() {
  const post = this.post;
  if (!post.tags || !post.categories) {
    return `<p class="related-posts-none">No related post.</p>`;
  }

  // 0. 「この記事を参照している記事」と重複しないよう、除外対象を先に求める
  const referenceIds = getReferencePostIds(this, post);

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
    .filter(p => p._id !== post._id && !referenceIds.has(p._id));

  if (tagRelatedPosts.length === 0) {
    // タグ関連記事がなければカテゴリの記事を取得し、HTMLを生成して返す
    console.log(`[INFO] Related Posts: No tag-related posts found for "${post.title}". Falling back to category.`);
    const categoryPosts = getCategoryRelatedPosts(this, post, referenceIds);
    return generateRelatedPostsHtml(categoryPosts);
  }

  const tagIDF = {};
  post.tags.data.forEach(tag => {
    tagIDF[tag.name] = Math.log(allPostsCount / tag.posts.length);
  });

  const relatedPosts = tagRelatedPosts.reduce((acc, p) => {
    // 既に評価済みの記事はスキップする。
    // tagRelatedPosts には共有タグの数だけ同じ記事が並ぶため、
    // ここで加算するとタグを多く共有する記事のスコアが二重三重に積み上がる
    if (acc.some(item => item._id === p._id)) {
      return acc;
    }

    let score = 0;

    p.tags.data.forEach(tag => {
      if (tagIDF[tag.name]) {
        score += tagIDF[tag.name];
      }
    });

    // タグを多く持つ記事ほど1タグあたりの意味が薄いため、タグ数で正規化する。
    // これがないと、大きなタグを複数持つ記事が全記事の関連記事を占めてしまう
    score /= Math.sqrt(p.tags.length || 1);

    if (p.author === post.author) {
      score += authorIDF[p.author];
    }

    acc.push({ ...p, score: score });
    return acc;
  }, []);

  // 3. 関連度スコアでソートし、同スコアの場合は日付でソート
  relatedPosts.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    } else {
      return b.date.valueOf() - a.date.valueOf();
    }
  });

  // 4. 記事数がmaxCountに満たない場合はカテゴリから補填
  if (relatedPosts.length < maxCount) {
    const postsToFill = getCategoryRelatedPosts(this, post, referenceIds);
    postsToFill.forEach(p => {
      if(relatedPosts.findIndex(rp => rp._id === p._id) === -1) {
        relatedPosts.push(p);
      }
    });
  }

  // 最終的な記事リストをHTMLに変換して返す
  return generateRelatedPostsHtml(relatedPosts);
});
