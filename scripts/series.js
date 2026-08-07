'use strict';

/**
 * 連載記事に前 / 次 と索引へのリンクを出すヘルパー。
 *
 * 連載への所属はフロントマターの series で宣言する。値がそのまま連載名になる。
 *
 *   series: "Go 1.27 リリース連載"
 *
 * 索引記事は series を持ち、かつ インデックス タグを持つ記事とする。
 * どちらも既にある語彙で、連載の索引には元から インデックス を付ける運用がある。
 *
 * 既存記事への series の付与は、本文冒頭の慣習
 * 「[Go 1.27 リリース連載](/articles/20260728a/) の 6 本目です。」を
 * 逆引きして一度だけ機械的に行った。逆引きは言い回しの揺れ（本目 / 回目 /
 * 日目 / 第N弾）や、連載を束ねる年間企画との区別を推測に頼るため、
 * 実行時には残していない。判定はフロントマターだけを見る。
 *
 * 番号は出さない。本文が名乗る番号（「6本目です」）と日付順の位置は、
 * 70連載中37件でズレていた。索引記事を1本目に数えるかが連載ごとに違い、
 * 本文と食い違う番号を機械が示す方が、番号が無いより害が大きい。
 */

let cache = null;

function build(site) {
  const groups = new Map(); // 連載名 -> 記事

  site.posts.sort('date', 1).each(post => {
    if (!post.series) return;
    if (!groups.has(post.series)) groups.set(post.series, []);
    groups.get(post.series).push(post);
  });

  const series = new Map(); // 記事のパス -> その記事から見た連載
  for (const [name, posts] of groups) {
    const index = posts.find(p => p.tags && p.tags.some(t => t.name === 'インデックス'));

    posts.forEach((post, i) => {
      series.set(post.path, {
        name,
        index: index && index !== post ? index : null,
        prev: i > 0 ? posts[i - 1] : null,
        next: i < posts.length - 1 ? posts[i + 1] : null
      });
    });
  }

  return series;
}

hexo.extend.helper.register('series_nav', function(post) {
  if (!cache) cache = build(this.site);
  return cache.get(post.path) || null;
});
