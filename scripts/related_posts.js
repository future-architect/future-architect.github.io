'use strict';

// 関連記事の最大表示件数
// 記事が長文化する傾向にあるため、記事末尾のスクロール量を抑える目的で絞っている
const maxCount = 3;
const {getSNSCnt} = require('./lib/sns');
const {postListItem} = require('./lib/post_list');
const {navLinkedPaths} = require('./lib/series');

// HTMLを生成するロジックを共通関数として外に切り出す
function generateRelatedPostsHtml(posts) {
  const count = Math.min(maxCount, posts.length);
  if (count === 0) {
    return `<p class="related-posts-none">No related post.</p>`;
  }

  let result = "";
  for (let i = 0; i < count; i++) {
    const related = posts[i];
    if (related) {
      const scoreText = related.score ? `スコア: ${related.score.toFixed(4)}` : '';
      const titleAttr = `${related.lede} ${scoreText}`.trim();
      // マークアップは lib/post_list.js に集約している
      result += postListItem(related, 'related-posts-item', titleAttr);
    }
  }

  return `
    <div class="widget">
      <ul class="related-post-link">${result}</ul>
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
function getCategoryRelatedPosts(ctx, post, isExcluded) {
  const currentCategory = post.categories.data[0];
  if (!currentCategory) {
    return [];
  }

  const categoryPosts = currentCategory.posts.data
    .filter(p => p._id !== post._id && !isExcluded(p));

  categoryPosts.sort((a, b) => {
    const snsA = getSNSCnt(a.permalink);
    const snsB = getSNSCnt(b.permalink);
    if (snsA !== snsB) {
      return snsB - snsA;
    } else {
      // 日付も同じなら パスで決める（決着が無いとビルドごとに並びが変わる）
      return b.date.valueOf() - a.date.valueOf()
        || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    }
  });

  return categoryPosts;
}


hexo.extend.helper.register('list_related_posts', function() {
  const post = this.post;
  if (!post.tags || !post.categories) {
    return `<p class="related-posts-none">No related post.</p>`;
  }

  // 0. 記事末尾で同じ記事が二度出ないよう、除外対象を先に求める。
  //    「この記事を参照している記事」と、連載ナビが既にリンクしている記事（索引・前・次）
  const referenceIds = getReferencePostIds(this, post);
  const linked = navLinkedPaths(this.site, post);
  const isExcluded = p => referenceIds.has(p._id) || linked.has(p.path);

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
    .filter(p => p._id !== post._id && !isExcluded(p));

  if (tagRelatedPosts.length === 0) {
    // タグ関連記事がなければカテゴリの記事を取得し、HTMLを生成して返す
    console.log(`[INFO] Related Posts: No tag-related posts found for "${post.title}". Falling back to category.`);
    const categoryPosts = getCategoryRelatedPosts(this, post, isExcluded);
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

  // 3. 関連度スコアでソートし、同スコアの場合は公開日が近い記事を優先する。
  //    技術記事は前提バージョンなど時代の文脈に依存するため、同じ関連度なら
  //    同時期の記事の方が読み継ぎやすい。連載の古い回が埋もれる問題も解消する。
  //    ただし過去方向は未来方向より重く扱い、わずかに新しい記事へ流れるようにする
  const PAST_PENALTY = 2;
  const dateDistance = p => {
    const diff = p.date.valueOf() - post.date.valueOf();
    return diff >= 0 ? diff : -diff * PAST_PENALTY;
  };

  // 最後にパスで決める。スコアと日付距離が同点になる組があり、
  // 決着が無いとビルドごとに選ばれる記事が入れ替わる
  relatedPosts.sort((a, b) =>
    b.score - a.score
    || dateDistance(a) - dateDistance(b)
    || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  // 4. 記事数がmaxCountに満たない場合はカテゴリから補填
  if (relatedPosts.length < maxCount) {
    const postsToFill = getCategoryRelatedPosts(this, post, isExcluded);
    postsToFill.forEach(p => {
      if(relatedPosts.findIndex(rp => rp._id === p._id) === -1) {
        relatedPosts.push(p);
      }
    });
  }

  // 最終的な記事リストをHTMLに変換して返す
  return generateRelatedPostsHtml(relatedPosts);
});
