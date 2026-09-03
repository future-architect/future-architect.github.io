'use strict';

/**
 * source/_data/tag_ontology.yml の親子構造。/tags/ の「親子関係」が根ごとの
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
  // ——タグができる前に辺だけ登録してある形（TiDB ⊆ DB）で、誤登録とは限らない
  const showable = (name) => tagInfo.has(name) || (children.get(name) || []).length > 0;

  const build = (name, parentName) => ({
    name,
    path: tagInfo.has(name) ? tagInfo.get(name).path : null,
    posts: tagInfo.has(name) ? tagInfo.get(name).ids.size : 0,
    family: familyIds(name, new Set([name])).size,
    otherParents: ((ontology[name] || {}).broader || []).filter((p) => p !== parentName),
    versions: (versionsByStem.get(name) || [])
      .sort((a, b) => (a < b ? 1 : -1)) // 新しい版を先に（名前の降順で近似）
      .map((v) => ({ name: v, path: tagInfo.get(v).path, posts: tagInfo.get(v).ids.size })),
    children: (children.get(name) || [])
      .filter(showable)
      .map((c) => build(c, name))
      .sort((a, b) => b.family - a.family || (a.name < b.name ? -1 : 1)),
  });

  // 根の下の子孫を平らにした列。/tags/ はチップで並べるので入れ子を持たない。
  // 深さは失われる（深さ3が31件・深さ4が2件）が、そのぶん狭い画面で縦に短くなる。
  // 並びは記事の多い順——次に行く先を選ぶ場所で、深さはもう表現できていないため
  const flatten = (node) => {
    const seen = new Map();
    const walk = (n) => {
      for (const c of n.children) {
        if (!seen.has(c.name)) seen.set(c.name, c);
        walk(c);
      }
    };
    walk(node);
    return [...seen.values()]
      .filter((c) => c.path) // 概念ノードは行き先が無いのでチップにできない
      .sort((a, b) => b.posts - a.posts || (a.name < b.name ? -1 : 1))
      .map((c) => ({ name: c.name, path: c.path, count: c.posts }));
  };

  // versionOf ノード（Vue3 等）は語幹に吸収されるので、木や独立タグには数えない
  const roots = Object.keys(ontology).filter(
    (n) => !hasParent.has(n) && !(ontology[n] && ontology[n].versionOf),
  );
  const trees = roots
    .filter((n) => children.has(n))
    .map((n) => build(n, null))
    .sort((a, b) => b.family - a.family || (a.name < b.name ? -1 : 1))
    .map((t) => ({ ...t, descendants: flatten(t) }));
  const standalone = roots
    .filter((n) => !children.has(n) && tagInfo.has(n))
    .map((n) => build(n, null))
    .sort((a, b) => b.posts - a.posts || (a.name < b.name ? -1 : 1));
  const orphanConcepts = Object.keys(ontology)
    .filter((n) => !showable(n) && !(ontology[n] && ontology[n].versionOf))
    .sort();
  const versionStems = [...versionsByStem.entries()]
    .map(([name, vers]) => ({ name, path: tagInfo.get(name).path, count: vers.length }))
    .sort((a, b) => b.count - a.count || (a.name < b.name ? -1 : 1));

  return {
    trees,
    standalone,
    orphanConcepts,
    versionStems,
    nodeCount: Object.keys(ontology).length,
  };
});
