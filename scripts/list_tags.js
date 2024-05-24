'use strict';

// custom list_tags
// https://github.com/noraj/hexo/blob/master/lib/plugins/helper/list_tags.js


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

  // Sort the tags
  tags = tags.sort(orderby, order);

  // Ignore tags with zero posts
  tags = tags.filter(tag => tag.length);

  // Limit the number of tags
  if (options.amount) tags = tags.limit(options.amount);

  if (style === 'list') {
    result += `<ul class="${className}-list" itemprop="keywords">`;

    tags.forEach(tag => {
      if (tag.length < minCount) {
        return;
      }

      result += `<li class="${className}-list-item">`;

      result += `<a class="${className}-list-link" href="${this.url_for(tag.path)}${suffix}" rel="tag">`;
      result += transform ? transform(tag.name) : tag.name;

      if (showCount) {
        result += `<span class="${className}-list-count">${tag.length}</span>`;
      }
      result += '</a>'; // spanがaタグの中に入るように修正

      result += '</li>';
    });

    if (minCount > 1) {
        result += `<li>`
        result += `<a href="/tags" style="color:#424242;">`;
        result += "タグ一覧へ";
        result += '</a>';
        result += '</li>';
    }

    result += '</ul>';
  } else {
    tags.forEach((tag, i) => {
      if (tag.length < minCount) {
          return;
      }
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
