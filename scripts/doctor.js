'use strict';

const pagination = require('hexo-pagination');

/**
 * /doctor/ 運営向けのメンテナンス画面 (#2058)。
 * タグ・カテゴリの付与漏れの候補を機械判定で列挙する。あくまで提案で、
 * 自動修正はしない。head.ejs で noindex にしており、メニューからも張らない。
 */
hexo.extend.generator.register('doctor', function (locals) {
  // ページ生成に1件必要なだけのダミー。並べてから取らないと OGP 画像が実行ごとに変わる
  return pagination('doctor', locals.posts.sort('-date').slice(0, 1), {
    layout: ['doctor'],
    data: { title: '記事ドクター' },
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

hexo.extend.helper.register('doctor_checks', function () {
  const posts = this.site.posts.sort('-date');

  // タグ→カテゴリの分布。提案の判定は記事自身の票を抜いて行う（leave-one-out）。
  // 自分の票が入ると、小さいタグでは現状カテゴリが常に勝って検出できない
  const tagCat = new Map(); // タグ -> (カテゴリ -> 記事数)
  const tagN = new Map();
  const catSize = new Map(); // カテゴリ -> 記事数
  posts.forEach((post) => {
    const cat = post.categories.first();
    if (!cat) return;
    catSize.set(cat.name, (catSize.get(cat.name) || 0) + 1);
    post.tags.forEach((tag) => {
      if (tag.name === 'インデックス') return;
      if (!tagCat.has(tag.name)) tagCat.set(tag.name, new Map());
      const dist = tagCat.get(tag.name);
      dist.set(cat.name, (dist.get(cat.name) || 0) + 1);
      tagN.set(tag.name, (tagN.get(tag.name) || 0) + 1);
    });
  });

  const suggestions = [];
  const untagged = [];
  const overTagged = [];
  const missingByTag = new Map(); // タグ名 -> {path, posts: []}

  // タグ -> 記事IDの集合。ほぼ重なるタグ（統合候補）と1記事タグの検出に使う
  const tagPostSets = new Map();
  const tagPath = new Map();
  this.site.tags.forEach((tag) => {
    tagPath.set(tag.name, tag.path);
    tagPostSets.set(tag.name, new Set(tag.posts.map((p) => p._id)));
  });

  const allTagNames = [];
  this.site.tags.forEach((tag) => {
    if (tag.length >= 3 && matchableTag(tag.name)) {
      allTagNames.push({ name: tag.name, path: tag.path });
    }
  });

  posts.forEach((post) => {
    const tagNames = post.tags.map((t) => t.name);

    // 1) タグ無し
    if (tagNames.length === 0) {
      untagged.push({ title: post.title, path: post.path });
    }
    // タグの付けすぎ。10タグ以上を見直し候補にする。
    // 中央値3の倍（7タグ）で拾うと件数が多すぎて手が付かない (#2259)
    if (tagNames.length >= 10) {
      overTagged.push({ title: post.title, path: post.path, count: tagNames.length });
    }

    // 2) カテゴリ提案
    const actualCat = post.categories.first();
    if (actualCat) {
      const score = new Map();
      tagNames.forEach((name) => {
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
          // 大きいカテゴリから小さいカテゴリへの提案でも、現状票を明確に
          // （0.5票以上）上回るときだけ出す。同着・僅差の提案は
          // 「どちらでも良い」と言っているだけで情報が無い。
          // 逆方向は2倍以上の票を要求する。緩めすぎると数百件になりレビューできない
          const toSmaller = (catSize.get(predName) || 0) < (catSize.get(actualCat.name) || 0);
          const pass = toSmaller
            ? predScore >= actualScore + 0.5 && predScore >= 1.0
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
      // 系統タグを既に持っていれば提案しない。DockerCompose が付いた記事に
      // Docker を、Go1.22 が付いた記事に Go を重ねて振る必要はない
      if (
        tagNames.some(
          (mine) => mine !== t.name && mine.toLowerCase().includes(t.name.toLowerCase()),
        )
      )
        continue;
      let hit;
      if (/^[\x20-\x7e]+$/.test(t.name)) {
        // 英数タグは単語境界で照合する（SQL が PostgreSQL に当たるのを防ぐ）
        const escaped = t.name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
        hit = new RegExp(`(^|[^A-Za-z0-9])${escaped}([^A-Za-z0-9]|$)`, 'i').test(post.title);
      } else {
        hit = post.title.includes(t.name);
      }
      if (hit) {
        if (!missingByTag.has(t.name)) missingByTag.set(t.name, { path: t.path, posts: [] });
        missingByTag.get(t.name).posts.push({ title: post.title, path: post.path });
      }
    }
  });

  suggestions.sort((a, b) => b.predScore - a.predScore);
  overTagged.sort((a, b) => b.count - a.count);
  const missing = [...missingByTag.entries()]
    .map(([name, v]) => ({ name, path: v.path, posts: v.posts }))
    .sort((a, b) => b.posts.length - a.posts.length);
  const missingTotal = missing.reduce((acc, m) => acc + m.posts.length, 0);

  // 4) ほぼ重なるタグ（統合候補）。A の記事がすべて B にも付いていて、
  //    B 側の差分も2本以内なら、実質同じ集合に2つの名前が付いている。
  //    Go1.27 ⊆ Go のような健全な階層（差が大きい包含）はここでは出さない
  const nearDuplicates = [];
  const tagEntries = [...tagPostSets.entries()].filter(([, set]) => set.size >= 2);
  for (const [a, A] of tagEntries) {
    for (const [b, B] of tagEntries) {
      if (a === b || B.size < A.size || B.size - A.size > 2) continue;
      if (A.size === B.size && a > b) continue; // 完全一致ペアの重複を防ぐ
      let subset = true;
      for (const x of A) {
        if (!B.has(x)) {
          subset = false;
          break;
        }
      }
      if (subset) {
        nearDuplicates.push({
          a,
          aPath: tagPath.get(a),
          aN: A.size,
          b,
          bPath: tagPath.get(b),
          bN: B.size,
          identical: A.size === B.size,
        });
      }
    }
  }
  nearDuplicates.sort((x, y) => x.bN - x.aN - (y.bN - y.aN) || y.aN - x.aN);

  // 5) カテゴリと同名のタグ。語彙が重複しているので、タグ側を削除して
  //    _config.yml の alias でタグURLをカテゴリへ転送する運用（IaC の前例 #2291）。
  //    大文字小文字違いの表記ゆれも同一視して拾う
  const categoryDupTags = [];
  const catByLower = new Map();
  this.site.categories.forEach((cat) => {
    catByLower.set(cat.name.toLowerCase(), { name: cat.name, path: cat.path, n: cat.length });
  });
  this.site.tags.forEach((tag) => {
    const cat = catByLower.get(tag.name.toLowerCase());
    if (cat) {
      categoryDupTags.push({
        name: tag.name,
        path: tag.path,
        n: tag.length,
        cat: cat.name,
        catPath: cat.path,
        catN: cat.n,
      });
    }
  });
  categoryDupTags.sort((a, b) => b.n - a.n);

  // 6) 1記事タグ。同じ記事に1記事タグ同士が同居している場合は、その記事の
  //    タグ付けがまとめて薄い可能性が高いので印を付ける
  //    （タグクラウドで * / ** として出していた仕様の移設）
  const singleUse = [];
  for (const [name, set] of tagPostSets) {
    if (set.size !== 1) continue;
    const postId = [...set][0];
    let lonelyPair = false;
    for (const [other, otherSet] of tagPostSets) {
      if (other !== name && otherSet.size === 1 && otherSet.has(postId)) {
        lonelyPair = true;
        break;
      }
    }
    singleUse.push({ name, path: tagPath.get(name), lonelyPair });
  }
  singleUse.sort((x, y) => y.lonelyPair - x.lonelyPair || (x.name < y.name ? -1 : 1));

  return {
    suggestions,
    untagged,
    overTagged,
    missing,
    missingTotal,
    nearDuplicates,
    categoryDupTags,
    singleUse,
  };
});

/**
 * タグオントロジー（source/_data/tag_ontology.yml）の親子構造を /doctor/ で
 * 見るためのツリー。複数親のノードはそれぞれの親の下に重複して出す
 * （DAG を1本の木に潰すと片方の系統から見えなくなる）。
 */
hexo.extend.helper.register('doctor_ontology', function() {
  const ontology = (this.site.data && this.site.data.tag_ontology) || {};

  const tagInfo = new Map(); // タグ名 -> {path, ids}
  this.site.tags.forEach(tag => {
    tagInfo.set(tag.name, {path: tag.path, ids: new Set(tag.posts.map(p => p._id))});
  });

  const children = new Map();
  const hasParent = new Set();
  for (const [name, node] of Object.entries(ontology)) {
    for (const p of (node && node.broader) || []) {
      if (!children.has(p)) children.set(p, []);
      children.get(p).push(name);
      hasParent.add(name);
    }
  }

  // バージョン同義（scripts/version_tags.js と同じ規則）。語幹ノードに「版」として出す
  const VERSIONED = /^(.+?)(\d+(?:\.\d+)+|\d{2,})$/;
  const stemOf = name => {
    const node = ontology[name];
    if (node && node.notVersion) return null;
    if (node && node.versionOf) return node.versionOf;
    const m = VERSIONED.exec(name);
    if (!m) return null;
    return tagInfo.has(m[1]) ? m[1] : null;
  };
  const versionsByStem = new Map();
  for (const name of tagInfo.keys()) {
    const stem = stemOf(name);
    if (!stem || stem === name) continue;
    if (!versionsByStem.has(stem)) versionsByStem.set(stem, []);
    versionsByStem.get(stem).push(name);
  }

  // 系統（自分＋子孫）のユニーク記事数。複数親経由で同じ記事を
  // 二重に数えないよう、本数ではなく記事IDの集合で持つ
  const familyMemo = new Map();
  const familyIds = (name, trail) => {
    if (familyMemo.has(name)) return familyMemo.get(name);
    const acc = new Set(tagInfo.has(name) ? tagInfo.get(name).ids : []);
    for (const c of children.get(name) || []) {
      if (trail.has(c)) continue; // 循環は整合性チェック側の担当。ここでは辿らないだけ
      trail.add(c);
      for (const id of familyIds(c, trail)) acc.add(id);
    }
    familyMemo.set(name, acc);
    return acc;
  };

  const build = (name, parentName) => {
    const info = tagInfo.get(name);
    return {
      name,
      path: info ? info.path : null, // タグとして実在しない概念ノードはリンク先が無い
      posts: info ? info.ids.size : 0,
      family: familyIds(name, new Set([name])).size,
      otherParents: ((ontology[name] || {}).broader || []).filter(p => p !== parentName),
      versions: (versionsByStem.get(name) || [])
        .sort((a, b) => (a < b ? 1 : -1)) // 新しい版を先に（名前の降順で近似）
        .map(v => ({name: v, path: tagInfo.get(v).path, posts: tagInfo.get(v).ids.size})),
      children: (children.get(name) || [])
        .map(c => build(c, name))
        .sort((a, b) => b.family - a.family || (a.name < b.name ? -1 : 1)),
    };
  };

  // versionOf ノード（Vue3 等）は語幹の「版」として出すので、木や独立タグには数えない
  const roots = Object.keys(ontology)
    .filter(n => !hasParent.has(n) && !(ontology[n] && ontology[n].versionOf));
  const trees = roots.filter(n => children.has(n))
    .map(n => build(n, null))
    .sort((a, b) => b.family - a.family || (a.name < b.name ? -1 : 1));
  const standalone = roots.filter(n => !children.has(n))
    .map(n => build(n, null))
    .sort((a, b) => b.posts - a.posts || (a.name < b.name ? -1 : 1));

  return {trees, standalone, nodeCount: Object.keys(ontology).length};
});

/**
 * 外部リンクの明示チェック (#2346)。
 *
 * ルール: サイトの導線で、リンクテキストから外部と読めないリンクには
 * 「（外部サイト）」を付ける。ブランド名・メディア名を名乗るリンクと、
 * 枠の見出しが一括で名乗る枠（アドベントカレンダー（Qiita））は対象外。
 * 記事本文は対象外（技術記事の参照は94%が外部で、マークは情報にならない）。
 *
 * テーマの ejs と、ラベルをデータで持つ hiring パネルを走査する。
 * 判定できない範囲: href が EJS 変数のリンク（現状 corporate_url のみで、
 * テキストが URL そのものなので自明）、scripts が生成する Tech Cast
 * （枠の見出しがポッドキャスト名を名乗る）
 */
const LINK_TEXT_EXEMPT = [
  '外部サイト', // 明示済み
  // ブランド・メディア名を名乗っているもの
  'connpass',
  'Youtube',
  'YouTube',
  'Qiita',
  'Feedly',
  'X(旧Twitter)',
  '公式note',
  'LEAD TO THE FUTURE',
  // X のフォローボタン。ブランドはアイコンが名乗る (#2036)
  'フォロー',
];
const LINK_EXEMPT_FILES = [
  // 枠の見出し「アドベントカレンダー（Qiita）」が一括で外部を名乗る
  '_widget/advent-calendar.ejs',
];

hexo.extend.helper.register('doctor_external_links', function () {
  const fs = require('fs');
  const path = require('path');
  const layoutDir = path.join(__dirname, '..', 'themes', 'future', 'layout');
  const findings = [];

  const textOf = (inner) => inner.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

  const scan = (file, content) => {
    // EJS 式は先に落とす。href の式が引用符を含むと属性の切り出しが壊れる
    const flat = content.replace(/<%[\s\S]*?%>/g, '');
    for (const m of flat.matchAll(/<a\b[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a/g)) {
      const text = textOf(m[2]);
      if (!text) continue; // アイコンだけのリンクは aria-label 側で名乗る
      if (LINK_TEXT_EXEMPT.some((w) => text.includes(w))) continue;
      findings.push({ file, text });
    }
  };

  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.ejs')) {
        const rel = path.relative(layoutDir, p).replace(/\\/g, '/');
        if (LINK_EXEMPT_FILES.includes(rel)) continue;
        scan(rel, fs.readFileSync(p, 'utf8'));
      }
    }
  };
  walk(layoutDir);

  // hiring パネルはラベルをデータで持つ（scripts/hiring_panels.js）
  const hiring = fs.readFileSync(path.join(__dirname, 'hiring_panels.js'), 'utf8');
  for (const m of hiring.matchAll(/label: '([^']+)'/g)) {
    if (LINK_TEXT_EXEMPT.some((w) => m[1].includes(w))) continue;
    findings.push({ file: 'scripts/hiring_panels.js', text: m[1] });
  }

  return findings;
});
