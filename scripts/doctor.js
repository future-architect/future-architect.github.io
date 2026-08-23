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

// カテゴリ提案（leave-one-out のタグ投票）は廃止した。
// タグ共起は「そのタグ群が普段いるカテゴリ」しか測れず記事の主題を見ないため、
// 一括監査（#2286 / #2288 / 2026-08-13 の /doctor 掃討）では精度25%、
// しかも票の高さが正しさと逆相関で、しきい値では直せなかった。
// 監査のネタ出しとしての役目は上記3回で回収済み

hexo.extend.helper.register('doctor_checks', function () {
  const posts = this.site.posts.sort('-date');

  // タグ -> 記事IDの集合。ほぼ重なるタグ（統合候補）と1記事タグの検出に使う
  const tagPostSets = new Map();
  const tagPath = new Map();
  this.site.tags.forEach((tag) => {
    tagPath.set(tag.name, tag.path);
    tagPostSets.set(tag.name, new Set(tag.posts.map((p) => p._id)));
  });

  posts.forEach((post) => {
    const tagNames = post.tags.map((t) => t.name);
  });

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
    nearDuplicates,
    singleUse,
  };
});

/**
 * オントロジーへの追加提案 (#2597)。
 *
 * 「A の記事が全部 B にも付いている」関係は共起から機械的に出せる。これは
 * A ⊆ B という包含で、多くは A が B の一種（GKE ⊆ GoogleCloud、
 * SpringBoot ⊆ Java）＝ broader の候補になる。
 *
 * ただし機械には「話題として広い」と「記事の種類が同じ」の区別が付かない。
 * 春の入門祭り ⊆ インデックス、YANS ⊆ 参加レポート のように、集合としては
 * 包含でも親子ではないものが混ざる。そのため related_tags.js は
 * tag_ontology.yml に書かれた関係だけを「もっと広いタグ」として表示し、
 * こちらは候補を並べるだけに留める。人が見て認めたものを yml に書き、
 * 書いた分だけ表示に反映される。
 *
 * 差が2本以内のペアは「ほぼ重なるタグ（統合候補）」が受け持つので出さない。
 * あちらは名前を1つに寄せる提案で、こちらは親子として繋ぐ提案。
 */
const ONTOLOGY_SUGGEST_MIN_DIFF = 3; // 差がこれ未満なら統合候補（別の節）の担当
const ONTOLOGY_SUGGEST_MIN_POSTS = 2; // 1記事タグは包含が偶然になりやすい

hexo.extend.helper.register('doctor_ontology_suggestions', function () {
  const ontology = (this.site.data && this.site.data.tag_ontology) || {};

  const sets = new Map(); // タグ名 -> 記事IDの集合
  const paths = new Map();
  this.site.tags.forEach((tag) => {
    sets.set(tag.name, new Set(tag.posts.map((p) => p._id)));
    paths.set(tag.name, tag.path);
  });

  // broader を多段に辿った祖先。直接の親でなくても、祖先に含まれていれば
  // 「もう繋がっている」ので提案しない
  const ancestorMemo = new Map();
  const ancestorsOf = (name) => {
    if (ancestorMemo.has(name)) return ancestorMemo.get(name);
    const acc = new Set();
    const walk = (n, trail) => {
      for (const p of (ontology[n] || {}).broader || []) {
        if (trail.has(p)) continue;
        trail.add(p);
        acc.add(p);
        walk(p, trail);
      }
    };
    walk(name, new Set([name]));
    ancestorMemo.set(name, acc);
    return acc;
  };

  // 版タグ（Go1.27）は名前の規則で語幹と同義になり、オントロジーに書く対象では
  // ないので提案しない（scripts/version_tags.js が担う）
  const VERSIONED = /^(.+?)(\d+(?:\.\d+)+|\d{2,})$/;
  const stemOf = (name) => {
    const node = ontology[name];
    if (node && node.notVersion) return null;
    if (node && node.versionOf) return node.versionOf;
    const m = VERSIONED.exec(name);
    return m && sets.has(m[1]) ? m[1] : null;
  };

  const entries = [...sets.entries()].filter(([, s]) => s.size >= ONTOLOGY_SUGGEST_MIN_POSTS);
  const suggestions = [];
  for (const [child, C] of entries) {
    const stem = stemOf(child);
    const known = ancestorsOf(child);
    for (const [parent, P] of entries) {
      if (parent === child || P.size - C.size < ONTOLOGY_SUGGEST_MIN_DIFF) continue;
      if (parent === stem) continue; // 版タグと語幹は名前の規則が担う
      if (known.has(parent)) continue; // すでに親子として書かれている
      let subset = true;
      for (const id of C) {
        if (!P.has(id)) {
          subset = false;
          break;
        }
      }
      if (!subset) continue;
      suggestions.push({
        child,
        childPath: paths.get(child),
        childN: C.size,
        parent,
        parentPath: paths.get(parent),
        parentN: P.size,
        // 子がオントロジーに未登録なら、親子を書く前にノードを足す必要がある
        childUnregistered: !ontology[child],
        parentUnregistered: !ontology[parent],
      });
    }
  }
  // 記事数の多い子から。影響するページが大きい順に見てもらう
  suggestions.sort(
    (a, b) => b.childN - a.childN || a.parentN - b.parentN || (a.child < b.child ? -1 : 1),
  );

  const childCount = new Set(suggestions.map((s) => s.child)).size;
  return { suggestions, childCount };
});

/**
 * タグオントロジー（source/_data/tag_ontology.yml）の親子構造を /doctor/ で
 * 見るためのツリー。複数親のノードはそれぞれの親の下に重複して出す
 * （DAG を1本の木に潰すと片方の系統から見えなくなる）。
 */
hexo.extend.helper.register('doctor_ontology', function () {
  const ontology = (this.site.data && this.site.data.tag_ontology) || {};

  const tagInfo = new Map(); // タグ名 -> {path, ids}
  this.site.tags.forEach((tag) => {
    tagInfo.set(tag.name, { path: tag.path, ids: new Set(tag.posts.map((p) => p._id)) });
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
  const stemOf = (name) => {
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
      otherParents: ((ontology[name] || {}).broader || []).filter((p) => p !== parentName),
      versions: (versionsByStem.get(name) || [])
        .sort((a, b) => (a < b ? 1 : -1)) // 新しい版を先に（名前の降順で近似）
        .map((v) => ({ name: v, path: tagInfo.get(v).path, posts: tagInfo.get(v).ids.size })),
      children: (children.get(name) || [])
        .map((c) => build(c, name))
        .sort((a, b) => b.family - a.family || (a.name < b.name ? -1 : 1)),
    };
  };

  // versionOf ノード（Vue3 等）は語幹の「版」として出すので、木や独立タグには数えない
  const roots = Object.keys(ontology).filter(
    (n) => !hasParent.has(n) && !(ontology[n] && ontology[n].versionOf),
  );
  const trees = roots
    .filter((n) => children.has(n))
    .map((n) => build(n, null))
    .sort((a, b) => b.family - a.family || (a.name < b.name ? -1 : 1));
  const standalone = roots
    .filter((n) => !children.has(n))
    .map((n) => build(n, null))
    .sort((a, b) => b.posts - a.posts || (a.name < b.name ? -1 : 1));

  return { trees, standalone, nodeCount: Object.keys(ontology).length };
});

/**
 * カテゴリの一言説明（source/_data/categories.yml #2405）の突き合わせ。
 * 投稿が途切れている著者 (#2418)。/authors/ の全期間タブで名前の後ろに
 * ** / * を付けていたものの移設。凡例がページのどこにも無く、読者には
 * 意味が読めない記号だった。「そろそろ声をかけると再開してくれるかも」は
 * 運営の関心なので、読者向けの一覧ではなくこちらに置く。
 *
 * 今年まだ投稿が無く、最後の投稿が昨年か一昨年の著者を返す。
 * それより古い著者は「途切れている」ではなく「離れた」なので出さない
 * （声かけの候補として現実的な範囲に絞る）。
 *
 * 本数では絞らない (#2744)。1本だけの著者こそ2本目を誘導する価値があるので、
 * 列が長くなっても名前を出す。表示は本数でまとめるので1本の人は最後の行に来る。
 *
 * 連続3年以上書いていた実績は名前に添えて示す。
 * 続けていた人が途切れたかどうかで声かけの重みが違う。
 */
const DORMANT_STREAK = 3;

// 連続して投稿していた最長の年数
const longestStreak = (years) => {
  const ys = [...years].sort((a, b) => a - b);
  let best = 0;
  let cur = 0;
  ys.forEach((y, i) => {
    cur = i > 0 && y - ys[i - 1] === 1 ? cur + 1 : 1;
    if (cur > best) best = cur;
  });
  return best;
};

hexo.extend.helper.register('doctor_dormant_authors', function () {
  const thisYear = new Date().getFullYear();
  const byAuthor = new Map(); // 著者 -> {years:Set, count}
  this.site.posts.forEach((post) => {
    // 共著の旧記事は author が配列
    [].concat(post.author || []).forEach((name) => {
      if (!name) return;
      if (!byAuthor.has(name)) byAuthor.set(name, { years: new Set(), count: 0 });
      const entry = byAuthor.get(name);
      entry.years.add(post.date.year());
      entry.count++;
    });
  });

  const recent = [];
  for (const [name, entry] of byAuthor) {
    if (entry.years.has(thisYear)) continue;
    const last = Math.max(...entry.years);
    const gap = thisYear - last;
    const row = {
      name,
      last,
      gap,
      count: entry.count,
      streak: longestStreak(entry.years),
    };
    if (gap !== 1 && gap !== 2) continue;
    recent.push(row);
  }
  // 表示は本数でまとめるので本数の多い順。同数なら最近まで書いていた人を先に
  recent.sort((a, b) => b.count - a.count || a.gap - b.gap || (a.name < b.name ? -1 : 1));
  return { recent, streakYears: DORMANT_STREAK };
});
