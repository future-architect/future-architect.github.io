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

/**
 * 直近1年に記事の無いタグは候補から外す。見送りを決めたタグが毎回並ぶと、
 * 新しく増えた分が埋もれる。
 *
 * 包含の候補（統合候補・親子の候補）は子の記事集合が親に含まれるので、
 * 子が活きていれば親も必ず活きている。判定は子だけで足りる。
 */
const ACTIVE_DAYS = 365;

const activeTagNames = (tags) => {
  const limit = Date.now() - ACTIVE_DAYS * 24 * 60 * 60 * 1000;
  const active = new Set();
  tags.forEach((tag) => {
    let newest = 0;
    tag.posts.forEach((post) => {
      const t = post.date ? post.date.valueOf() : 0;
      if (t > newest) newest = t;
    });
    if (newest >= limit) active.add(tag.name);
  });
  return active;
};

hexo.extend.helper.register('doctor_checks', function () {
  const posts = this.site.posts.sort('-date');
  const active = activeTagNames(this.site.tags);

  // タグ -> 記事IDの集合。ほぼ重なるタグ（統合候補）と1記事タグの検出に使う
  const tagPostSets = new Map();
  const tagPath = new Map();
  this.site.tags.forEach((tag) => {
    tagPath.set(tag.name, tag.path);
    tagPostSets.set(tag.name, new Set(tag.posts.map((p) => p._id)));
  });

  // 4) ほぼ重なるタグ（統合候補）。A の記事がすべて B にも付いていて、
  //    B 側の差分も2本以内なら、実質同じ集合に2つの名前が付いている。
  //    Go1.27 ⊆ Go のような健全な階層（差が大きい包含）はここでは出さない
  const nearDuplicates = [];
  const tagEntries = [...tagPostSets.entries()].filter(([, set]) => set.size >= 2);
  for (const [a, A] of tagEntries) {
    if (!active.has(a)) continue;
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
    if (set.size !== 1 || !active.has(name)) continue;
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
  const active = activeTagNames(this.site.tags);
  const suggestions = [];
  for (const [child, C] of entries) {
    if (!active.has(child)) continue;
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
 * 本文に何度も出てくるのにタグが付いていない記事 (#2784)。
 *
 * タイトル照合（#2708 で一巡して廃止）を lede と章・節・項に広げる案を測ったが、
 * 候補が1,493行に膨らみ、目視の妥当率が lede 30%・見出し 10% まで落ちた。
 * lede は背景を書く場所なので「A ではなく B の話」の A を拾い（GitLab の記事に
 * GitHub、Vue.js の記事に React、PostgreSQL 全文検索の記事に Elasticsearch）、
 * 見出しは節の粒度なので手順の1ステップを拾う（「Linuxインストール」
 * 「Dockerイメージをプッシュ」）。語がどこに出るかは主題を示さない。
 *
 * 効いたのは位置ではなく本文全体での出現回数だった。見出しも本文の一部なので、
 * 章立て全体に渡って出てくる語は回数で上がり、1回だけ出る手順の語は落ちる。
 *
 * 照合に使えない語は notInText で1つずつ外す。語の一般性を機械で測る手
 * （その語が本文に出る記事のうち実際にタグが付いている割合）は #2708 の
 * 判断と突き合わせると値の帯が重なり、付与判断と相関しなかった。
 */
const TEXT_SUGGEST_MIN_COUNT = 12; // 下げると急に増える（8回で109件、3回で573件）
const TEXT_SUGGEST_DAYS = 730;
const TEXT_SUGGEST_MIN_POSTS = 3; // 1〜2記事のタグは偶然の一致になりやすい

// 短い名前は一般語に当たりやすい（Go が Google に当たる等）ので、
// 英数3文字・和文4文字を下限にする
const matchableTag = (name) => (/^[\x20-\x7e]+$/.test(name) ? name.length >= 3 : name.length >= 4);

// 散文だけを数える。コード・インラインコード・URL・HTMLタグの中に出る語は
// 記事の主題ではなく識別子や参照先で、見出しのリンク先（Go の issue へのリンクが
// GitHub に当たる等）もここで落ちる
const proseOf = (md) =>
  md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ');

// 英数タグは単語境界で数える（SQL が PostgreSQL に当たるのを防ぐ）
const countRegExp = (name) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  return /^[\x20-\x7e]+$/.test(name)
    ? new RegExp(`(?:^|[^A-Za-z0-9])${escaped}(?=[^A-Za-z0-9]|$)`, 'gi')
    : new RegExp(escaped, 'g');
};

hexo.extend.helper.register('doctor_text_suggestions', function () {
  const ontology = (this.site.data && this.site.data.tag_ontology) || {};
  const limit = Date.now() - TEXT_SUGGEST_DAYS * 24 * 60 * 60 * 1000;

  const candidates = [];
  this.site.tags.forEach((tag) => {
    if (tag.posts.length < TEXT_SUGGEST_MIN_POSTS || !matchableTag(tag.name)) return;
    // 同名衝突（連載の索引を指す「インデックス」が DB インデックスに当たる）と
    // 一般語は照合に使えない。判断は tag_ontology.yml の notInText が持つ
    if ((ontology[tag.name] || {}).notInText) return;
    candidates.push({
      name: tag.name,
      path: tag.path,
      lower: tag.name.toLowerCase(),
      re: countRegExp(tag.name),
    });
  });

  // 抽象タグは書かなくてよい (#2292) ので、記事のタグから broader を辿って
  // 届く語は提案しない（Dev Containers の記事に Docker、MCP の記事に LLM）
  const ancestorMemo = new Map();
  const ancestorsOf = (name) => {
    if (ancestorMemo.has(name)) return ancestorMemo.get(name);
    const acc = new Set();
    const walk = (n, trail) => {
      const node = ontology[n] || {};
      for (const p of node.broader || []) {
        if (trail.has(p)) continue;
        trail.add(p);
        acc.add(p);
        walk(p, trail);
      }
      if (typeof node.versionOf === 'string' && !trail.has(node.versionOf)) {
        trail.add(node.versionOf);
        acc.add(node.versionOf);
        walk(node.versionOf, trail);
      }
    };
    walk(name, new Set([name]));
    ancestorMemo.set(name, acc);
    return acc;
  };

  const rows = [];
  let total = 0;
  this.site.posts.forEach((post) => {
    if (!post.date || post.date.valueOf() < limit) return;
    const prose = proseOf(String(post._content || post.raw || ''));
    const lower = prose.toLowerCase();
    const tagNames = post.tags.map((t) => t.name);
    const own = new Set(tagNames);
    const reachable = new Set();
    tagNames.forEach((t) => ancestorsOf(t).forEach((a) => reachable.add(a)));

    const hits = [];
    for (const c of candidates) {
      if (own.has(c.name) || reachable.has(c.name)) continue;
      // タイトルに連載名を含む記事では、連載名の一部に当たっても主題ではない
      if (post.series && String(post.series).includes(c.name)) continue;
      // 系統タグを既に持っていれば提案しない（Go1.27 の記事に Go を重ねない）
      if (tagNames.some((mine) => mine !== c.name && mine.toLowerCase().includes(c.lower)))
        continue;
      if (!lower.includes(c.lower)) continue; // 回数を数える前の粗い篩
      const count = (prose.match(c.re) || []).length;
      if (count >= TEXT_SUGGEST_MIN_COUNT) hits.push({ name: c.name, path: c.path, count });
    }
    if (!hits.length) return;
    hits.sort((a, b) => b.count - a.count);
    total += hits.length;
    // 直す単位は記事のフロントマターなので、記事ごとにまとめる
    rows.push({ title: post.title, path: post.path, tags: hits, top: hits[0].count });
  });
  rows.sort((a, b) => b.top - a.top || (a.title < b.title ? -1 : 1));

  return { posts: rows, total, minCount: TEXT_SUGGEST_MIN_COUNT, years: TEXT_SUGGEST_DAYS / 365 };
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
