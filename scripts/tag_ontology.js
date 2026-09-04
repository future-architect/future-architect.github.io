'use strict';

/**
 * source/_data/tag_ontology.yml の親子構造。/tags/ の「親子関係を持つタグ」が根ごとの
 * 群として描き、/doctor/ が登録の漏れ（独立ノード・行き先の無い概念ノード）を
 * 見る (#3196)。複数親のノードはそれぞれの親の下に重複して出す
 * （DAG を1本の木に潰すと片方の系統から見えなくなる）。
 */
hexo.extend.helper.register('tag_forest', function () {
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

  // バージョン同義（scripts/version_tags.js と同じ規則）。語幹に吸収されるタグ
  const VERSIONED = /^(.+?)(\d+(?:\.\d+)+|\d{2,})$/;
  const stemOf = (name) => {
    const node = ontology[name];
    if (node && node.notVersion) return null;
    if (node && node.versionOf) return node.versionOf;
    const m = VERSIONED.exec(name);
    if (!m) return null;
    return tagInfo.has(m[1]) ? m[1] : null;
  };
  // 末尾が4桁の年なら軸はバージョンではなく年（related_tags.js の isYear と同じ線）。
  // インターン2022 / GoogleCloudNext2024 / NLP2024 がこちらで、
  // PostgreSQL18 は2桁なので年にならない
  const YEAR = /^(?:19|20)\d{2}$/;
  const isYear = (name) => {
    const m = VERSIONED.exec(name);
    return !!m && YEAR.test(m[2]);
  };
  // 1.27 -> 1027、2024 -> 2024。桁上げが 1000 なのは 1.9 < 1.27 を正しく扱うため
  const versionKey = (name) =>
    VERSIONED.exec(name)[2]
      .split('.')
      .reduce((acc, n) => acc * 1000 + Number(n), 0);

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

  // タグでも親でもないノードは木に出さない。行き先が無いうえ子も連れないので、
  // 読者にはただの行き止まりになる。**消さずに /doctor/ が漏れとして拾う**
  // ——タグができる前に辺だけ登録した形もありうるので、誤登録とは限らない
  const showable = (name) => tagInfo.has(name) || (children.get(name) || []).length > 0;

  // 子は「それ自身が子を持つか」で2つに分ける。持たない子は横に流れるチップ、
  // 持つ子は自分のラベルを立てて中を字下げする (#3196)。全部をチップにすると
  // DynamoDB ⊃ DynamoDBStreams のような関係が平らになり、全部を行にすると縦に伸びる
  const build = (name) => {
    const kids = (children.get(name) || []).filter(showable).map(build);
    return {
      name,
      path: tagInfo.has(name) ? tagInfo.get(name).path : null,
      posts: tagInfo.has(name) ? tagInfo.get(name).ids.size : 0,
      family: familyIds(name, new Set([name])).size,
      versions: (versionsByStem.get(name) || [])
        .sort((a, b) => (a < b ? 1 : -1)) // 新しい版を先に（名前の降順で近似）
        .map((v) => ({ name: v, path: tagInfo.get(v).path, posts: tagInfo.get(v).ids.size })),
      // チップは記事の多い順。次に行く先を選ぶ場所なので大きいものから並べる
      chips: kids
        .filter((c) => !c.subs.length && !c.chips.length && c.path)
        .sort((a, b) => b.posts - a.posts || (a.name < b.name ? -1 : 1))
        .map((c) => ({ name: c.name, path: c.path, count: c.posts })),
      subs: kids
        .filter((c) => c.subs.length || c.chips.length)
        .sort((a, b) => b.family - a.family || (a.name < b.name ? -1 : 1)),
    };
  };

  // versionOf ノード（Vue3 等）は語幹に吸収されるので、木や独立タグには数えない
  const roots = Object.keys(ontology).filter(
    (n) => !hasParent.has(n) && !(ontology[n] && ontology[n].versionOf),
  );
  // 根は名前順。系統の大きさで並べると、読者が探している主題がどこにあるか
  // 名前からは当てが付かない（#3205）。中の子は記事の多い順のまま。
  // コードポイント順だと大文字が先に来て AWS < Airflow になるので localeCompare
  const trees = roots
    .filter((n) => children.has(n))
    .map(build)
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  const orphanConcepts = Object.keys(ontology)
    .filter((n) => !showable(n) && !(ontology[n] && ontology[n].versionOf))
    .sort();
  // /tags/ の「バージョンを持つタグ」。年で分かれるものは出さない——
  // インターン2022 を「バージョン」と呼ぶことになり、個別のタグページが
  // 「他の年」と名乗っているのと食い違う。木と同じ形で描けるよう節点の形に揃える
  const versioned = [...versionsByStem.entries()]
    .filter(([, vers]) => !vers.every(isYear))
    .map(([name, vers]) => ({
      name,
      path: tagInfo.get(name).path,
      posts: tagInfo.get(name).ids.size,
      chips: vers
        .sort((a, b) => versionKey(b) - versionKey(a)) // 新しい版が先
        .map((v) => ({ name: v, path: tagInfo.get(v).path, count: tagInfo.get(v).ids.size })),
      subs: [],
    }))
    .sort(
      (a, b) => b.chips.length - a.chips.length || b.posts - a.posts || (a.name < b.name ? -1 : 1),
    );

  return {
    trees,
    orphanConcepts,
    versioned,
    nodeCount: Object.keys(ontology).length,
  };
});
