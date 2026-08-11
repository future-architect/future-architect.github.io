'use strict';

// custom list_tags
// https://github.com/noraj/hexo/blob/master/lib/plugins/helper/list_tags.js

const {getSNSCnt} = require('./lib/sns');

// タグに紐づく記事のSNSリアクション（Twitter/FaceBook/Hatebu/Pocket/Feedly）の合計
const snsTotalCount = tag => tag.posts.map(post => getSNSCnt(post.permalink)).reduce((acc, cur) => acc + cur, 0);

function listTopPageTags(tags, options) {
  if (!options && (!tags || !Object.prototype.hasOwnProperty.call(tags, 'length'))) {
    options = tags;
    tags = this.site.tags;
  }

  if (!tags || !tags.length) return '';
  options = options || {};

  const { style = 'list', transform, separator = ', ', suffix = '' } = options;
  const showCount = Object.prototype.hasOwnProperty.call(options, 'show_count') ? options.show_count : true;
  const className = options.class || 'tag';
  const orderby = options.orderby || 'name';
  const order = options.order || 1;
  const minCount = options.minCount || 1; // 拡張
  let result = '';

  // Ignore tags with zero posts
  // 表示対象の絞り込みは amount で件数を切る前に済ませる
  tags = tags.filter(tag => tag.length && tag.length >= minCount);

  // Sort the tags
  // snsCount は Warehouse のフィールドではないため、配列に変換して独自に並べ替える
  if (orderby === 'snsCount') {
    tags = tags.toArray()
      .map(tag => ({tag, snsCount: snsTotalCount(tag)})) // 比較のたびに集計し直さないよう先にキーを持たせる
      .sort((a, b) => b.snsCount - a.snsCount)
      .map(entry => entry.tag);
  } else {
    tags = tags.sort(orderby, order).toArray();
  }

  // Limit the number of tags
  if (options.amount) tags = tags.slice(0, options.amount);

  if (style === 'list') {
    result += `<ul class="${className}-list" itemprop="keywords">`;

    tags.forEach(tag => {
      result += `<li class="${className}-list-item">`;

      result += `<a class="${className}-list-link" href="${this.url_for(tag.path)}${suffix}" rel="tag">`;
      result += transform ? transform(tag.name) : tag.name;

      if (showCount) {
        result += `<span class="${className}-list-count">${tag.length}</span>`;
      }
      result += '</a>'; // spanがaタグの中に入るように修正

      result += '</li>';
    });

    // 「タグ一覧へ」チップはここに居たが、タグに見えるうえ連載枠の
    // 「すべての連載を見る」とテイストが揃わないため、ホーム側の
    // 枠下リンク（すべてのタグを見る）に移した (#2304)
    result += '</ul>';
  } else {
    tags.forEach((tag, i) => {
      if (i) result += separator;

      result += `<a class="${className}-link" href="${this.url_for(tag.path)}${suffix}" rel="tag">`;
      result += transform ? transform(tag.name) : tag.name;

      if (showCount) {
        result += `<span class="${className}-count">${tag.length}</span>`;
      }

      result += '</a>';
    });
  }

  return result;
}

hexo.extend.helper.register('list_toppagetags', listTopPageTags);
