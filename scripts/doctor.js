'use strict';

const pagination = require('hexo-pagination');

/**
 * /doctor/ 運営向けのメンテナンス画面 (#2058)。
 * タグ・カテゴリの付与漏れの候補を機械判定で列挙する。あくまで提案で、
 * 自動修正はしない。head.ejs で noindex にしており、メニューからも張らない。
 */
hexo.extend.generator.register('doctor', function(locals) {
  // ページ生成に1件必要なだけのダミー。並べてから取らないと OGP 画像が実行ごとに変わる
  return pagination('doctor', locals.posts.sort('-date').slice(0, 1), {
    layout: ['doctor'],
    data: {title: '記事ドクター'}
  });
});

// タイトル照合の対象とするタグ名。短い名前は一般語に当たりやすい
// （Go が Google に当たる等）ので、英数3文字・和文4文字を下限にする
function matchableTag(name) {
  if (/^[\x20-\x7e]+$/.test(name)) return name.length >= 3;
  return name.length >= 4;
}

// 数が多い受け皿カテゴリ。カテゴリ運用のルールとして、ここへ寄せる提案はしない
// （何でも Programming / DevOps に見えてしまうため、具体的なカテゴリへ
// 移す方向だけを提案する）
const SUGGEST_IGNORE = new Set(['Programming', 'DevOps']);

hexo.extend.helper.register('doctor_checks', function() {
  const posts = this.site.posts.sort('-date');

  // タグ→カテゴリの分布。提案の判定は記事自身の票を抜いて行う（leave-one-out）。
  // 自分の票が入ると、小さいタグでは現状カテゴリが常に勝って検出できない
  const tagCat = new Map(); // タグ -> (カテゴリ -> 記事数)
  const tagN = new Map();
  const catSize = new Map(); // カテゴリ -> 記事数
  posts.forEach(post => {
    const cat = post.categories.first();
    if (!cat) return;
    catSize.set(cat.name, (catSize.get(cat.name) || 0) + 1);
    post.tags.forEach(tag => {
      if (tag.name === 'インデックス') return;
      if (!tagCat.has(tag.name)) tagCat.set(tag.name, new Map());
      const dist = tagCat.get(tag.name);
      dist.set(cat.name, (dist.get(cat.name) || 0) + 1);
      tagN.set(tag.name, (tagN.get(tag.name) || 0) + 1);
    });
  });

  const suggestions = [];
  const untagged = [];
  const missingByTag = new Map(); // タグ名 -> {path, posts: []}

  const allTagNames = [];
  this.site.tags.forEach(tag => {
    if (tag.length >= 3 && matchableTag(tag.name)) {
      allTagNames.push({name: tag.name, path: tag.path});
    }
  });

  posts.forEach(post => {
    const tagNames = post.tags.map(t => t.name);

    // 1) タグ無し
    if (tagNames.length === 0) {
      untagged.push({title: post.title, path: post.path});
    }

    // 2) カテゴリ提案
    const actualCat = post.categories.first();
    if (actualCat) {
      const score = new Map();
      tagNames.forEach(name => {
        if (name === 'インデックス') return;
        const n = tagN.get(name) || 0;
        if (n < 4) return; // 自票を抜くと3本未満。判断材料にしない
        for (const [c, cnt] of tagCat.get(name)) {
          const loo = c === actualCat.name ? cnt - 1 : cnt;
          score.set(c, (score.get(c) || 0) + loo / (n - 1));
        }
      });
      if (score.size) {
        const ranked = [...score.entries()].sort((a, b) => b[1] - a[1]);
        // 受け皿カテゴリへ寄せる提案はしない（運用ルール）
        const candidate = ranked.find(([c]) => c !== actualCat.name && !SUGGEST_IGNORE.has(c));
        const actualScore = score.get(actualCat.name) || 0;
        if (candidate) {
          const [predName, predScore] = candidate;
          // 迷ったら数の少ない専門カテゴリへ寄せる、という運用ルールを写す。
          // 大きいカテゴリから小さいカテゴリへの提案は現状と同票でも出し、
          // 逆方向は2倍以上の票を要求する。緩めすぎると数百件になりレビューできない
          const toSmaller = (catSize.get(predName) || 0) < (catSize.get(actualCat.name) || 0);
          const pass = toSmaller
            ? predScore >= actualScore && predScore >= 1.0
            : predScore >= 2 * actualScore && predScore >= 1.5;
          if (pass) {
            suggestions.push({
              title: post.title,
              path: post.path,
              actual: actualCat.name,
              suggested: predName,
              predScore: Math.round(predScore * 10) / 10,
              actualScore: Math.round(actualScore * 10) / 10,
            });
          }
        }
      }
    }

    // 3) タイトルにタグ名を含むのに、そのタグが付いていない
    const has = new Set(tagNames);
    for (const t of allTagNames) {
      if (has.has(t.name)) continue;
      // タイトルに連載名を含む記事（「Go 1.27 リリース連載：uuid」等）では、
      // 連載名の一部（リリース 等）に当たっても記事の主題ではない
      if (post.series && String(post.series).includes(t.name)) continue;
      let hit;
      if (/^[\x20-\x7e]+$/.test(t.name)) {
        // 英数タグは単語境界で照合する（SQL が PostgreSQL に当たるのを防ぐ）
        const escaped = t.name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
        hit = new RegExp(`(^|[^A-Za-z0-9])${escaped}([^A-Za-z0-9]|$)`, 'i').test(post.title);
      } else {
        hit = post.title.includes(t.name);
      }
      if (hit) {
        if (!missingByTag.has(t.name)) missingByTag.set(t.name, {path: t.path, posts: []});
        missingByTag.get(t.name).posts.push({title: post.title, path: post.path});
      }
    }
  });

  suggestions.sort((a, b) => b.predScore - a.predScore);
  const missing = [...missingByTag.entries()]
    .map(([name, v]) => ({name, path: v.path, posts: v.posts}))
    .sort((a, b) => b.posts.length - a.posts.length);
  const missingTotal = missing.reduce((acc, m) => acc + m.posts.length, 0);

  return {suggestions, untagged, missing, missingTotal};
});
