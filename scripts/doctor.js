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

// カテゴリ提案（leave-one-out のタグ投票）は廃止した。
// タグ共起は「そのタグ群が普段いるカテゴリ」しか測れず記事の主題を見ないため、
// 一括監査（#2286 / #2288 / 2026-08-13 の /doctor 掃討）では精度25%、
// しかも票の高さが正しさと逆相関で、しきい値では直せなかった。
// 監査のネタ出しとしての役目は上記3回で回収済み

hexo.extend.helper.register('doctor_checks', function () {
  const posts = this.site.posts.sort('-date');

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

    // 2) タイトルにタグ名を含むのに、そのタグが付いていない
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

  const textOf = (inner) =>
    inner
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();

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
 */
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

  const rows = [];
  for (const [name, entry] of byAuthor) {
    if (entry.years.has(thisYear)) continue;
    const last = Math.max(...entry.years);
    const gap = thisYear - last;
    if (gap === 1 || gap === 2) rows.push({ name, last, count: entry.count, gap });
  }
  // 表示は本数でまとめるので本数の多い順。同数なら最近まで書いていた人を先に
  rows.sort((a, b) => b.count - a.count || a.gap - b.gap || (a.name < b.name ? -1 : 1));
  return rows;
});

/**
 * 説明の無いカテゴリ（新設時の書き忘れ）と、カテゴリとして実在しない
 * 説明（改名・統合後の消し忘れやタイプミス）を両方向で検出する。
 */
hexo.extend.helper.register('doctor_category_descriptions', function () {
  const described = new Set(Object.keys((this.site.data && this.site.data.categories) || {}));
  const actual = new Set(this.site.categories.map((c) => c.name));
  return {
    missing: [...actual].filter((name) => !described.has(name)).sort(),
    orphaned: [...described].filter((name) => !actual.has(name)).sort(),
  };
});
