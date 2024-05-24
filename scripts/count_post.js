'use strict';

const {getSNSCnt,getTwitterCnt,getFacebookCnt,getHatebuCnt,getPocketCnt} = require('./lib/sns');

// 総投稿件数
hexo.extend.helper.register('count_articles', function() {
  return this.site.posts.length;
});
// 年別の投稿件数
hexo.extend.helper.register('count_articles_year', function(year) {
  return this.site.posts.filter(post => post.date.format("YYYY") === year.toString()).length;
});
// 年・月別の投稿件数
hexo.extend.helper.register('count_articles_month', function(year, month) {
  let mm = month.toString().padStart(2, '0');
  return this.site.posts.filter(post => post.date.format("YYYYMM") === year.toString() + mm).length;
});

// 著者に紐づく投稿件数
hexo.extend.helper.register('count_author', function(name) {
  return this.site.posts.filter(post => post.author === name).length;
});

// 参考: https://github.com/hexojs/hexo/issues/2189
hexo.extend.helper.register('count_tag', function(name) {
  return this.site.posts.filter(post => post.tags.filter(tag => tag.name === name).length > 0).length;
});

hexo.extend.helper.register('count_category', function(name) {
  return this.site.posts.filter(post => post.categories.filter(category => category.name === name).length > 0).length;
});

hexo.extend.helper.register('join_pagetag', function(name) {
  return this.page.tags.map(tag => tag.name).join(',');
});

/*
 * 期間ページ
 */
hexo.extend.helper.register('summary_all_term', function() {
  const posts = this.site.posts;

  const total = posts.map(post => getSNSCnt(post.permalink)).reduce((acc, cur) => acc + cur);
  const authors = posts.map(post => post.author).flat().unique().length;
  const tw = posts.map(post => getTwitterCnt(post.permalink)).reduce((acc, cur) => acc + cur);
  const fb = posts.map(post => getFacebookCnt(post.permalink)).reduce((acc, cur) => acc + cur);
  const hatebu = posts.map(post => getHatebuCnt(post.permalink)).reduce((acc, cur) => acc + cur);
  const pocket = posts.map(post => getPocketCnt(post.permalink)).reduce((acc, cur) => acc + cur);

  return {
    total: total,
    authors: authors,
    twitter: tw,
    facebook: fb,
    hatebu: hatebu,
    pocket: pocket
  };
});

hexo.extend.helper.register('summary_yearly_term', function(year) {
  const posts = this.site.posts.filter(post => post.date.format("YYYY") == year.toString());

  const total = posts.map(post => getSNSCnt(post.permalink)).reduce((acc, cur) => acc + cur);
  const authors = posts.map(post => post.author).flat().unique().length;
  const tw = posts.map(post => getTwitterCnt(post.permalink)).reduce((acc, cur) => acc + cur);
  const fb = posts.map(post => getFacebookCnt(post.permalink)).reduce((acc, cur) => acc + cur);
  const hatebu = posts.map(post => getHatebuCnt(post.permalink)).reduce((acc, cur) => acc + cur);
  const pocket = posts.map(post => getPocketCnt(post.permalink)).reduce((acc, cur) => acc + cur);

  return {
    total: total,
    authors: authors,
    twitter: tw,
    facebook: fb,
    hatebu: hatebu,
    pocket: pocket
  };
});

/*
 * カテゴリ個別ページ
 */
hexo.extend.helper.register('summary_category', function(category) {
  const posts = this.site.posts.filter(post => post.categories.map(c => c.name).includes(category));

  const total = posts.map(post => getSNSCnt(post.permalink)).reduce((acc, cur) => acc + cur);
  const authors = posts.map(post => post.author).flat().unique().length;
  const tw = posts.map(post => getTwitterCnt(post.permalink)).reduce((acc, cur) => acc + cur);
  const fb = posts.map(post => getFacebookCnt(post.permalink)).reduce((acc, cur) => acc + cur);
  const hatebu = posts.map(post => getHatebuCnt(post.permalink)).reduce((acc, cur) => acc + cur);
  const pocket = posts.map(post => getPocketCnt(post.permalink)).reduce((acc, cur) => acc + cur);

  return {
    total: total,
    authors: authors,
    twitter: tw,
    facebook: fb,
    hatebu: hatebu,
    pocket: pocket
  };
});

/*
 * タグ個別ページ
 */
hexo.extend.helper.register('summary_tag', function(category) {
  const posts = this.site.posts.filter(post => post.tags.map(t => t.name).includes(category));

  const total = posts.map(post => getSNSCnt(post.permalink)).reduce((acc, cur) => acc + cur);
  const authors = posts.map(post => post.author).flat().unique().length;
  const tw = posts.map(post => getTwitterCnt(post.permalink)).reduce((acc, cur) => acc + cur);
  const fb = posts.map(post => getFacebookCnt(post.permalink)).reduce((acc, cur) => acc + cur);
  const hatebu = posts.map(post => getHatebuCnt(post.permalink)).reduce((acc, cur) => acc + cur);
  const pocket = posts.map(post => getPocketCnt(post.permalink)).reduce((acc, cur) => acc + cur);

  return {
    total: total,
    authors: authors,
    twitter: tw,
    facebook: fb,
    hatebu: hatebu,
    pocket: pocket
  };
});
