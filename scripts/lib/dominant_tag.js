'use strict';

// 連載の索引につけるタグ。トピックではないので支配タグの候補から外す
const OPS_TAGS = new Set(['インデックス']);
// 1ページに収まるカテゴリでは、スクロールすれば全部見えるので絞る意味がない
const MIN_POSTS = 25;
// 過半数。ここを下げると Frontend や DataScience まで広がるが、
// 3割程度のタグは「支配している」とは言えず、絞り込みはタグページで足りる
const DOMINANT_RATIO = 0.5;

/**
 * カテゴリの過半数を1つのタグが占めていれば、そのタグと残りの記事を返す。
 * 該当しなければ null。
 */
function dominantTag(category) {
  if (category.length < MIN_POSTS) return null;

  const counts = new Map();
  category.posts.forEach(post => {
    if (!post.tags) return;
    post.tags.forEach(tag => {
      if (OPS_TAGS.has(tag.name)) return;
      counts.set(tag.name, (counts.get(tag.name) || 0) + 1);
    });
  });

  let top = null;
  for (const [name, count] of counts) {
    // 同数は名前で決める（決着が無いとビルドごとに変わる）
    if (!top || count > top.count || (count === top.count && name < top.name)) {
      top = {name, count};
    }
  }
  if (!top || top.count / category.length <= DOMINANT_RATIO) return null;

  const rest = category.posts.filter(post => !post.tags.some(t => t.name === top.name));
  return {name: top.name, count: top.count, rest, slug: `without-${top.name.toLowerCase()}`};
}

module.exports = {dominantTag};
