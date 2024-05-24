'use strict';

const maxCount = 6;
const {getSNSCnt} = require('./lib/sns');

hexo.extend.helper.register('list_related_posts', function() {
  const post = this.post;
  if (post.tags === undefined) {
    // 404.html
    return `<p class="related-posts-none">No related post.</p>`;
  }

  const sameAuthorPosts = this.site.posts.data.filter(p => p.author === post.author);
  const tagRelatedPosts = post.tags.data.flatMap(tag => tag.posts.data);
  const postList = sameAuthorPosts.concat(tagRelatedPosts).filter(p => p._id !== post._id);

  let relatedPosts = reduceTag(postList);
  relatedPosts.sort(dynamicSort('date', false));
  relatedPosts.sort(dynamicSort('count', false));

  const count = Math.min(maxCount, relatedPosts.length);
  if(count === 0){
    return `<p class="related-posts-none">No related post.</p>`;
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
  for (var i = 0; i < count; i++) {
    if (relatedPosts[i] == undefined) {
      continue;
    }

    const related = relatedPosts[i];
    result += `<li class="related-posts-item"><span>${related.date.format('YYYY.MM.DD')}</span><span class="snscount">&#9825;${getSNSCnt(related.permalink)}</span><a href=/${related.path} title="${related.lede}">${related.title}${label(related)}</a></li>`;
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

