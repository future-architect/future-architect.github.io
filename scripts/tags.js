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

/**
 * カスタムタグクラウドヘルパー
 * @param {object} options - オプション
 * @param {number} [options.min_font=12] - 最小フォントサイズ
 * @param {number} [options.max_font=26] - 最大フォントサイズ
 * @param {string} [options.font_unit='px'] - フォントサイズの単位
 * @param {number} [options.boost_ratio=0.7] - 上昇ペースの度合い（1未満で序盤のペースが上がる）
 * @returns {string} - タグクラウドのHTML文字列
 */
function customTagCloudHelper(options) {
  const hexo = this;
  const { site } = hexo;
  const tags = site.tags.sort('name', 1);

  if (!tags.length) {
    return '';
  }

  // 「***」を付与するタグを事前に計算する
  // 1. タグを「紐づく記事IDの集合」でグループ化するためのMap
  const postSetToTagsMap = new Map();

  site.tags.forEach(tag => {
    // 記事が2未満のタグは今回の条件に関係ないので除外
    if (tag.length < 2) {
      return;
    }
    // 記事のIDをソートして、一意のキーを作成 (例: "id1,id2,id3")
    const postIds = tag.posts.map(post => post._id).sort();
    const key = postIds.join(',');

    if (!postSetToTagsMap.has(key)) {
      postSetToTagsMap.set(key, []);
    }
    postSetToTagsMap.get(key).push(tag.name);
  });

  // 2. 条件に合う「完全に一致する」タグの集合（Set）を作成
  const matchedTagSet = new Set();
  postSetToTagsMap.forEach((tagGroup, postSetKey) => {
    // 記事リストが完全に一致するタグが2つ以上あるグループのみが対象
    if (tagGroup.length >= 2) {
      tagGroup.forEach(tagName => {
        matchedTagSet.add(tagName);
      });
    }
  });

  // 全てのタグの完全な情報をMapに保存（「**」の判定で使用）
  const tagDataMap = new Map();
  site.tags.forEach(t => {
    tagDataMap.set(t.name, t);
  });

  // オプションのデフォルト値を設定
  options = options || {};
  const minFont = options.min_font || 12;
  const maxFont = options.max_font || 26;
  const fontUnit = options.font_unit || 'px';
  const boostRatio = options.boost_ratio || 0.7;

  const sizes = tags.map(tag => tag.length);
  const maxSize = Math.max(...sizes) || 1;
  const minSize = Math.min(...sizes) || 1;
  const spread = maxSize - minSize;

  let result = '';

  tags.forEach(tag => {
    // フォントサイズの計算
    const ratio = spread === 0 ? 0.5 : (tag.length - minSize) / spread;
    const adjustedRatio = Math.pow(ratio, boostRatio);
    const fontSize = minFont + (maxFont - minFont) * adjustedRatio;

    let tagName = tag.name;
    let suffix = '';

    // 3. メインループでsuffixを付与
    //    「***」の条件を最優先でチェック
    if (matchedTagSet.has(tag.name)) {
      suffix = '***';
    }
    // それ以外のタグで、記事数が1つの場合は「*」または「**」の判定
    else if (tag.length === 1) {
      suffix = '*';
      const singlePost = tag.posts.first();
      const otherTags = singlePost.tags.filter(t => t.name !== tag.name);
      if (otherTags.length > 0 && otherTags.some(otherTag => {
        const fullTagInfo = tagDataMap.get(otherTag.name);
        return fullTagInfo && fullTagInfo.length === 1;
      })) {
        suffix = '**';
      }
    }

    tagName += suffix;
    tagName = tagName.replace(/ /g, '-');
    const tagLink = hexo.url_for(tag.path);

    result += `<a href="${tagLink}" style="font-size: ${fontSize.toFixed(2)}${fontUnit};">${tagName}</a>\n`;
  });

  return result;
}

hexo.extend.helper.register('custom_tagcloud', customTagCloudHelper);
