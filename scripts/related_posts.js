'use strict';

const maxCount = 6;
const {getSNSCnt} = require('./lib/sns');

hexo.extend.helper.register('list_related_posts', function() {
  const post = this.post;
  if (!post.tags || !post.categories) {
    // タグやカテゴリがない場合は処理を終了
    return `<p class="related-posts-none">No related post.</p>`;
  }

  // 1. タグに関連する記事を取得（最優先）
  const tagRelatedPosts = post.tags.data.flatMap(tag => tag.posts.data).filter(p => p._id !== post._id);

  // 重複を排除し、タグの重複が多いものを優先
  let relatedPosts = reduceTag(tagRelatedPosts);
  relatedPosts.sort(dynamicSort('count', false));

  // 2. 記事数がmaxCountに満たない場合はカテゴリから補填
  if (relatedPosts.length < maxCount) {
    const needMore = maxCount - relatedPosts.length;

    // 現在のカテゴリを取得
    const currentCategory = post.categories.data[0];
    if (currentCategory) {
      // カテゴリ内の全記事を取得し、現在の記事とタグ記事を除外
      const categoryPosts = currentCategory.posts.data
        .filter(p => p._id !== post._id && objectArrayIndexOf(relatedPosts, p._id) === -1);

      // 補填記事をSNS人気順、同率なら最新順にソート
      categoryPosts.sort((a, b) => {
        const snsA = getSNSCnt(a.permalink);
        const snsB = getSNSCnt(b.permalink);
        if (snsA !== snsB) {
          return snsB - snsA; // SNSカウントで降順ソート
        } else {
          return b.date.valueOf() - a.date.valueOf(); // 日付で降順ソート
        }
      });

      // 不足分を補填
      const postsToFill = categoryPosts.slice(0, needMore);
      relatedPosts = relatedPosts.concat(postsToFill);
    }
  }

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
      result += `<li class="related-posts-item"><span>${related.date.format('YYYY.MM.DD')}</span><span class="snscount">&#9825;${getSNSCnt(related.permalink)}</span><a href=/${related.path} title="${related.lede}">${related.title}${label(related)}</a></li>`;
    }
  }

  return `
    <div class="widget">
      <ul class="nav related-post-link">${result}</ul>
    </div>`;
});

function reduceTag(posts) {
  return posts.reduce((newPosts, post) => {
    const i = objectArrayIndexOf(newPosts, post._id);
    if(i === -1){
      post.count = 1;
      newPosts.push(post);
    }else{
      newPosts[i].count += 1;
    }
    return newPosts;
  }, []);
}

function objectArrayIndexOf(array, id) {
  for(let i = 0; i < array.length; i++){
    if (array[i]._id === id) return i;
  }
  return -1;
}

function dynamicSort(property, isAscending) {
  let sortOrder = -1;
  if (isAscending) sortOrder = 1;
  return function (a, b) {
    const result = (a[property] < b[property]) ? -1 :
                 (a[property] > b[property]) ? 1 : 0;
    return result * sortOrder;
  };
}

