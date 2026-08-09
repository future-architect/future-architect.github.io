'use strict';

const pagination = require('hexo-pagination');
const {getSNSCnt} = require('./lib/sns');

// /tags
hexo.extend.generator.register("tags", function(locals) {
   // ページ生成に1件必要なだけのダミー。並べてから取らないと OGP 画像が実行ごとに変わる
   return  pagination('tags', locals.posts.sort('-date').slice(0, 1), {
        layout: ['tags', 'archive', 'index'],
    });
});

hexo.extend.helper.register('count_tags', function() {
  return this.site.tags.length;
});

// 初出が新しいタグ。新しく登場したトピックの入口として /tags/ に並べる (#2052)。
// 「今年初出」だと年明けや更新が止まったときに空になるため、
// トップページの「新着記事」と同じ発想の件数固定にする
hexo.extend.helper.register('recent_new_tags', function(limit = 15) {
  return this.site.tags
    .map(tag => {
      const first = tag.posts.map(p => p.date).reduce((a, b) => (a.isBefore(b) ? a : b));
      return {name: tag.name, path: tag.path, count: tag.posts.length, first};
    })
    // 同点の決着が無いとビルドごとに並びが変わる
    .sort((a, b) => b.first - a.first || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .slice(0, limit);
});

// タグ個別ページの統計。カテゴリページ (#2084) と同じ「直近1年」を出す (#2088)
hexo.extend.helper.register('tag_stats', function(name) {
  const tag = this.site.tags.findOne({name});
  if (!tag) return null;
  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const recentAuthors = new Set();
  let recent = 0;
  tag.posts.forEach(post => {
    if (post.date.valueOf() < oneYearAgo) return;
    recent++;
    // 共著の旧記事は author が配列
    [].concat(post.author || []).forEach(a => recentAuthors.add(a));
  });
  return {recent, recentAuthorCount: recentAuthors.size};
});

hexo.extend.helper.register('median_tags_per_post', function() {
  const counts = this.site.posts.map(p => (p.tags ? p.tags.length : 0)).sort((a, b) => a - b);
  return counts[Math.floor(counts.length / 2)] || 0;
});

hexo.extend.helper.register('ranking_tags', function(limit = 30) {
  const tagPosts = this.site.tags.map(tag => ({tag:tag, posts:tag.posts, count:tag.posts.length, shareCount:totalCount(tag.posts)}));

  // 同点の決着が無いとビルドごとに並びが変わる
  const score = t => (t.shareCount + t.count) / t.count;
  const compareFunc = (a, b) =>
    score(b) - score(a)
    || (a.tag.name < b.tag.name ? -1 : a.tag.name > b.tag.name ? 1 : 0);

  // 5記事以上、シェア数/投稿数のランキング
  const rankings = tagPosts.filter(tp => tp.count >= 5).sort(compareFunc).slice(0, limit)

  // マークアップは関連タグ・「今年使われ始めたタグ」と同じチップに揃える。
  // 以前は素のテキストリンクで、同じページ内でタグの見た目が割れていた (#2052)
  let result = "";
  rankings.map(tp => {
    result += `<li class="tag-list-item"><a class="tag-list-link" href="${this.url_for(tp.tag.path)}" rel="tag" title="${tp.tag.name} の記事 ${tp.count}本（総シェア ${tp.shareCount}）">${tp.tag.name}<span class="tag-list-count">${tp.count}</span></a></li>`;
  });
  return `<div class="blog-tags"><div class="widget"><ul class="tag-list">${result}</ul></div></div>`;
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
