'use strict';

const pagination = require('hexo-pagination');
const {getSNSCnt} = require('./lib/sns');

// /tags
hexo.extend.generator.register("tags", function(locals) {
   return  pagination('tags', locals.posts.slice(0, 1), {
        layout: ['tags', 'archive', 'index'],
    });
});

hexo.extend.helper.register('count_tags', function() {
  return this.site.posts.map(post => post.tags).flat().unique().length;
});

hexo.extend.helper.register('ranking_tags', function() {

  const tagPosts = this.site.tags.map(tag => ({tag:tag, posts:tag.posts, count:tag.posts.length, shareCount:totalCount(tag.posts)}));

  const compareFunc = (a, b) => (b.shareCount + b.count)/b.count - (a.shareCount + a.count)/a.count;

  // 5記事以上、シェア数/投稿数のランキング
  const rankings = tagPosts.filter(tp => tp.count >= 5).sort(compareFunc).slice(0, 30)

  let result = "";
  rankings.map(tp => {
    result += `<li class="popular-tag-list"><a href="/tags/${tp.tag.name}" title="&#9825;${tp.shareCount}">${tp.tag.name} <span class="pupular-tag-count">${tp.count}</span></a></li>`;
  });
  return `<ul class="popular-tag">${result}</ul>`;
});

const totalCount = (posts) => {
  return posts.map(post => getSNSCnt(post.permalink)).reduce((acc, cur) => acc + cur);
}


