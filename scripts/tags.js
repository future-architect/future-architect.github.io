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
  const catCount = new Map();
  tag.posts.forEach(post => {
    post.categories.forEach(c => {
      const e = catCount.get(c.name) || {name: c.name, path: c.path, count: 0};
      e.count++;
      catCount.set(c.name, e);
    });
    if (post.date.valueOf() < oneYearAgo) return;
    recent++;
    // 共著の旧記事は author が配列
    [].concat(post.author || []).forEach(a => recentAuthors.add(a));
  });
  // そのタグの記事がどのカテゴリに属するか。カテゴリページの topTags の対で、
  // 件数も同じ上位5件。ただし 10本に1本（10%）に満たないカテゴリは
  // 見出しの「よく使われる」とは言えないので切る。2番手カテゴリのシェアは
  // 10%以上に集中していて、これより下で拾えるのはほぼ2〜3本のノイズだった。
  // 1本きりのカテゴリは割合によらず傾向と言えないので数えない (#2139)
  const topCategories = [...catCount.values()]
    .filter(c => c.count >= 2 && c.count / tag.posts.length >= 0.10)
    // 同点の決着が無いとビルドごとに並びが変わる
    .sort((a, b) => b.count - a.count || (a.name < b.name ? -1 : 1))
    .slice(0, 5);
  return {recent, recentAuthorCount: recentAuthors.size, topCategories};
});

const median = nums => {
  const sorted = [...nums].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] || 0;
};
const mean = nums => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);
const round1 = n => Math.round(n * 10) / 10;

// タグの付け方を示す統計。平均と中央値を並べるのは、少数の大きいタグに
// 引っ張られて両者が倍以上ずれるため（1タグあたり 平均6.9 / 中央値3）
hexo.extend.helper.register('tags_per_post', function() {
  const counts = this.site.posts.map(p => (p.tags ? p.tags.length : 0));
  return {mean: round1(mean(counts)), median: median(counts)};
});

hexo.extend.helper.register('posts_per_tag', function() {
  const counts = this.site.tags.map(t => t.length);
  return {mean: round1(mean(counts)), median: median(counts)};
});

// 年ごとに初めて使われたタグの数。タグがどれだけ増えてきたかを示す。
// 内訳はタグの首位カテゴリ（最も多く使われているカテゴリ）で積む (#2279)。
// どの分野が新しいトピックを生んでいるかが色で見える
hexo.extend.helper.register('new_tags_by_year', function() {
  const byYearCat = new Map(); // 初出年 -> (カテゴリ -> タグ数)
  this.site.tags.forEach(tag => {
    const first = tag.posts.map(p => p.date.format('YYYY')).sort()[0];
    const catCount = new Map();
    tag.posts.forEach(post => {
      post.categories.forEach(c => catCount.set(c.name, (catCount.get(c.name) || 0) + 1));
    });
    // 同数の決着が無いとビルドごとに割り当てが変わる
    const top = [...catCount.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
    const cat = top ? top[0] : '未分類';
    if (!byYearCat.has(first)) byYearCat.set(first, new Map());
    const m = byYearCat.get(first);
    m.set(cat, (m.get(cat) || 0) + 1);
  });
  const years = [...byYearCat.keys()].sort();
  // 並びは他のカテゴリ積み上げと同じサイト累計順で固定 (#2201)
  const present = new Set();
  byYearCat.forEach(m => m.forEach((cnt, c) => present.add(c)));
  const catOrder = this.site.categories.toArray()
    .sort((a, b) => b.length - a.length || (a.name < b.name ? -1 : 1))
    .map(c => c.name)
    .filter(c => present.has(c));
  const extras = [...present].filter(c => !catOrder.includes(c)).sort();
  const series = catOrder.concat(extras).map(c => ({
    name: c,
    data: years.map(y => byYearCat.get(y).get(c) || 0)
  }));
  return JSON.stringify({years, series});
});

// 年ごとの新規タグを「定着したか」で積む (#2279)。
// 定着 = 初出から1年以内に2記事目が付いたこと。観察窓を1年に固定するのは、
// 「その後使われたか」で判定すると新しい年ほど再利用の機会が無く、
// 年同士を比較できないため。初出から1年未満のタグは判定途中で「定着せず」側に出る
hexo.extend.helper.register('new_tags_retention', function() {
  const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
  const byYear = new Map(); // 初出年 -> {settled, unsettled}
  this.site.tags.forEach(tag => {
    const dates = tag.posts.map(p => p.date.valueOf()).sort((a, b) => a - b);
    const year = tag.posts.map(p => p.date.format('YYYY')).sort()[0];
    const settled = dates.length >= 2 && dates[1] - dates[0] <= YEAR_MS;
    if (!byYear.has(year)) byYear.set(year, {settled: 0, unsettled: 0});
    byYear.get(year)[settled ? 'settled' : 'unsettled']++;
  });
  const years = [...byYear.keys()].sort();
  return JSON.stringify({
    years,
    series: [
      {name: '定着', data: years.map(y => byYear.get(y).settled)},
      {name: '定着せず', data: years.map(y => byYear.get(y).unsettled)}
    ]
  });
});

hexo.extend.helper.register('ranking_tags', function() {
  const tagPosts = this.site.tags.map(tag => ({tag:tag, posts:tag.posts, count:tag.posts.length, shareCount:totalCount(tag.posts)}));

  // 同点の決着が無いとビルドごとに並びが変わる
  const score = t => (t.shareCount + t.count) / t.count;
  const compareFunc = (a, b) =>
    score(b) - score(a)
    || (a.tag.name < b.tag.name ? -1 : a.tag.name > b.tag.name ? 1 : 0);

  // 5記事以上、シェア数/投稿数のランキング
  const rankings = tagPosts.filter(tp => tp.count >= 5).sort(compareFunc).slice(0, 30)

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

    // メンテ用の * / ** / *** マークは /doctor/ に移した (#2058)。
    // クラウドは読者向けの導線なので、運営向けの印を混ぜない
    const tagName = tag.name.replace(/ /g, '-');
    const tagLink = hexo.url_for(tag.path);

    result += `<a href="${tagLink}" style="font-size: ${fontSize.toFixed(2)}${fontUnit};">${tagName}</a>\n`;
  });

  return result;
}

hexo.extend.helper.register('custom_tagcloud', customTagCloudHelper);
