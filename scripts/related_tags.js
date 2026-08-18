'use strict';

/**
 * タグページに「関連するタグ」を出すヘルパー。
 *
 * 関連は記事の共起（同じ記事に一緒に付いている）から測る。抽象度の階層を
 * 人手で定義しなくても、Terraform から IaC（抽象）と Terraform1.4（具体）の
 * 両方が出てくる。記事が増えれば精度も上がる。
 *
 * 共起数だけで並べると、Go や AWS のような母数の大きいタグがどのページでも
 * 上位に来て情報にならない。そこで lift（偶然そうなる場合の何倍か）で補正する。
 *
 *   lift = 実際の共起数 / (Aの本数 × Bの本数 / 全記事数)
 *
 * 実データでは Go × AWS が共起26本でも lift 1.2倍（Go が261本あるので当然）、
 * Terraform × IaC は共起11本で lift 17倍。後者の方が関係として強い。
 *
 * ただし lift だけで並べると、共起1〜2本のタグが上位を占める。分母が小さいと
 * lift が飽和するためで、1本の共起から関係の強さは測れない。
 * 共起数 × log(1 + lift) の折衷にしている。
 *
 * また共起では「同じ仲間だが同じ記事には付かない」関係が見えない。
 * Go1.26 と Go1.27 の共起は0本で、バージョン違いは排他的に付くため原理的に
 * 検出できない。そこで名前の形（末尾の数字を外した接頭辞が一致する）から
 * 同じ系列のタグを拾う。
 *
 * 出すのは3つの群で、読者の目的ごとに分ける (#2569)。
 *
 *   1. 詳しく見る … 移動先が今のタグの中に収まる（共起の部分集合＋系列の子）
 *   2. 隣を見る   … 一緒に付いている。移動すると新しい記事に出会える
 *   3. 同じ系列   … 版違い（Go1.26 の隣の Go1.27）と親（無印の Go）
 *
 * 1 と 2 を分けるのは目的が違うためで、同時に枠の奪い合いも避けられる。
 * lift は移動先が小さいほど跳ねる（2本のタグで50倍前後）ので、同じ列に混ぜると
 * 2本のタグが CI/CD や Vite のような中堅を8枠から追い出す。実データで測ると
 * 199件が入る代わりに 79件が消えた。群を分ければ消えるものは0件になる。
 *
 * 1 に系列の子（Go の下の Go1.27）を入れるのは、実データの子26件すべてが親の
 * 完全な部分集合、つまり共起由来の絞り込みと同じ関係だったため。
 * それでも親子の判定を集合ではなく名前で行うのは、包含がタグ付け次第で崩れる
 * から。子に親タグを付け忘れた記事が1本あるだけで、Go1.24 だけが群から落ちて
 * 並びが不揃いになる。名前なら揺れない。代わりにパネルは移動先の本数だけを
 * 出し、包含は名乗らない。
 * 3 に残るのは版のページ（Go1.26 など26件）から見た親と別の版で、こちらは
 * 絞り込みではなく「広げる」「横に移る」関係になる。
 *
 * 並びは 1 → 2 → 3。1ページ目の関連タグは一覧の前にあり、読者はまだ
 * このタグで合っているかを見ている (#2088)。群にラベルがあるので後ろの群も
 * 目的から探せる（ラベルが無いと末尾の群は見落とされる #2357）。
 *
 * 1 の上限は共起由来にだけ掛け、系列の子は全部出す。名前の一致は共起と違って
 * 決定的な関係なので、件数による裏付けは要らない。系列が1つでも、移動先が
 * 1本でも出す。読者にとって Go1.26 の隣に Go1.27 があるのは自明で、薄い結果でも
 * 期待が裏切られない。接頭辞そのもののタグ（無印: Go / GoogleCloudNext）も
 * 同じ系列に含める (#2355)。親ページに子の一覧が出て、子ページには親が系列の
 * 先頭に出る。実データでは Go / インターン / GoogleCloudNext / Terraform /
 * PostgreSQL / NLP の6系列（無印含む）が拾え、束ね間違いは無かった。
 *
 * リンク先は単にそのタグのページで、2タグの AND 検索はしない。
 * 組み合わせの数だけページが増えるうえ、読者の行動としても
 * 「Terraform を見たが IaC 全体も見てみるか」という乗り換えに近い。
 */

// 1ページに表示する記事数（_config.yml の per_page と揃える）
const PER_PAGE = 25;
// 共起から出すタグの数。系列はこの枠に数えず、全部出す
const MAX_CO_TAGS = 8;
// 共起がこれ未満なら関係を測れない
const MIN_CO_OCCURRENCE = 2;
// 移動先の記事がこれ未満だと、クリックしても得るものが少ない。
// 3件あれば選択肢として成立する（詳しく見る群には掛けない。あちらは
// 移動先の少なさが目的なので、共起2本＝移動先2本でも出す #2569）
const MIN_DESTINATION_POSTS = 3;
// 「新しい記事」がこれ未満なら、移動しても既に見た記事しか出てこない
const MIN_NEW_POSTS = 2;
// 詳しく見る群を共起から作るタグの大きさ。これ以下なら一覧を眺めるだけで済む (#2569)
const NARROWING_MIN_POSTS = 5;
// 共起由来の絞り込みの上限。実データでは102ページ中100ページが12件以内
// （中央値2件）で、超えるのは Go の39件と GoogleCloud の22件だけ。件数の多い順に
// 並べるので、切れるのは2〜3本の細いタグになる。12 は系列の最大（Go1.16〜1.27 の
// 12件）と同じ大きさで、この長さまでは表示側が受け止められると分かっている
const MAX_NARROWING_TAGS = 12;

// 末尾の数字（1.27 や 2024）を切り出す。接頭辞が一致すれば同じ系列とみなす
const VERSIONED = /^(.*?)(\d+(?:\.\d+)*)$/;

function family(name) {
  const m = VERSIONED.exec(name);
  // 接頭辞が空（"2024" のような数字だけのタグ）は系列として扱わない
  return m && m[1] ? m[1] : null;
}

// 1.27 -> 1027、2024 -> 2024。桁上げを 1000 にしているのは
// 1.9 < 1.27 を正しく扱うため（文字列比較だと逆になる）
function versionKey(name) {
  return VERSIONED.exec(name)[2]
    .split('.')
    .reduce((acc, n) => acc * 1000 + Number(n), 0);
}

// 同点は名前で決める（決着が無いとビルドごとに並びが変わる）
function byName(a, b) {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

// site.tags は毎回同じなので、共起の集計は一度だけ行って使い回す
let cache = null;

function build(site) {
  const postTags = new Map(); // 記事ID -> タグ名の配列
  const total = new Map(); // タグ名 -> 記事数
  const path = new Map(); // タグ名 -> URL のパス
  const families = new Map(); // 接頭辞 -> 同じ系列のタグ名

  site.tags.forEach((tag) => {
    total.set(tag.name, tag.length);
    // URL は自前で組まない。tag_map や記号の置換（Go1.18 -> tags/Go1-18）が
    // 効いており、encodeURIComponent(name) では存在しないパスになる
    path.set(tag.name, tag.path);
    const stem = family(tag.name);
    if (stem) {
      if (!families.has(stem)) families.set(stem, []);
      families.get(stem).push(tag.name);
    }
    tag.posts.forEach((post) => {
      if (!postTags.has(post._id)) postTags.set(post._id, []);
      postTags.get(post._id).push(tag.name);
    });
  });

  // 接頭辞そのもののタグ（無印: Go / GoogleCloudNext / NLP など）も同じ系列に
  // 含める (#2355)。無印は VERSIONED に合わないため、収集後にここで足す。
  // 実データで無印を持つ系列は6つ（Go / GoogleCloudNext / インターン /
  // Terraform / NLP / PostgreSQL）で、いずれも意味的に正しい親子だった
  for (const [stem, members] of families) {
    if (total.has(stem)) members.push(stem);
  }

  const co = new Map(); // "A\u0000B" -> 共起数
  for (const names of postTags.values()) {
    const sorted = [...new Set(names)].sort();
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const key = `${sorted[i]}\u0000${sorted[j]}`;
        co.set(key, (co.get(key) || 0) + 1);
      }
    }
  }

  // タグごとに共起相手を引けるようにしておく
  const partners = new Map();
  for (const [key, n] of co) {
    const [a, b] = key.split('\u0000');
    if (!partners.has(a)) partners.set(a, []);
    if (!partners.has(b)) partners.set(b, []);
    partners.get(a).push([b, n]);
    partners.get(b).push([a, n]);
  }

  return { total, path, families, co, partners, postCount: site.posts.length };
}

hexo.extend.helper.register('related_tags', function (tagName) {
  if (!cache) cache = build(this.site);
  const { total, path, families, co, partners, postCount } = cache;

  const own = total.get(tagName);
  if (!own) return [];

  const coWith = (name) => co.get([tagName, name].sort().join('\u0000')) || 0;
  const member = (name) => {
    const posts = total.get(name);
    const shared = coWith(name);
    return { name, path: path.get(name), posts, co: shared, fresh: posts - shared };
  };

  // 同じ系列のタグ。無印タグ（Go / GoogleCloudNext）のページでは
  // 自分が接頭辞そのものになる (#2355)
  const stem = family(tagName) || (families.has(tagName) ? tagName : null);
  const relatives = (stem ? families.get(stem) || [] : []).filter((name) => name !== tagName);
  const relativeNames = new Set(relatives);
  // 接頭辞のページから見た系列は全部「より詳しいタグ」。版のページから見た系列は
  // 親（無印）と別の版で、絞り込みではないので独立した群にする
  const children = stem === tagName ? relatives.map(member) : [];
  const series = (stem === tagName ? [] : relatives)
    .map(member)
    // 無印（親）はバージョンを持たないので先頭に置く。系列全体への入口のため
    .map((r) => ({ ...r, version: VERSIONED.test(r.name) ? versionKey(r.name) : Infinity }))
    .sort((a, b) => b.version - a.version); // 新しいバージョンを先に

  // 移動先に新しい記事が1本しか無い相手を出すかどうか。1ページに収まるタグでは
  // スクロールすれば全部見えるので、読者が求めるのは新しい記事に出会えるタグの方。
  // 1ページを超えるタグなら、わずかでも絞れることに意味がある。
  // 新しい記事が0本（完全な部分集合）の相手は詳しく見る群が受け持つ
  const allowThinNew = own > PER_PAGE;

  const candidates = (partners.get(tagName) || [])
    .map(([name, n]) => ({
      ...member(name),
      co: n,
      fresh: (total.get(name) || 0) - n,
      lift: (n * postCount) / (own * (total.get(name) || 0)),
    }))
    // 系列は上で拾っているので重複させない
    .filter((r) => !relativeNames.has(r.name) && r.co >= MIN_CO_OCCURRENCE);

  // 詳しく見る群 (#2569)。移動先の記事が全部このタグにもある（fresh が0）関係と、
  // 系列の子。新しい記事には出会えないが、大きなタグの中から目的の話題へ降りる道
  // になる。共起の8枠とは別に数える（枠を奪い合わせない）
  const narrowing =
    own > NARROWING_MIN_POSTS
      ? candidates
          .filter((r) => r.fresh === 0)
          .sort((a, b) => b.posts - a.posts || byName(a, b))
          .slice(0, MAX_NARROWING_TAGS)
      : [];
  const detail = narrowing.concat(children).sort((a, b) => b.posts - a.posts || byName(a, b));

  const score = (r) => r.co * Math.log(1 + r.lift);
  const adjacent = candidates
    .filter(
      (r) =>
        r.fresh > 0 &&
        r.posts >= MIN_DESTINATION_POSTS &&
        (allowThinNew || r.fresh >= MIN_NEW_POSTS),
    )
    .sort((a, b) => score(b) - score(a) || byName(a, b))
    .slice(0, MAX_CO_TAGS);

  // 空の群は返さない。表示側でラベルだけが残らないようにする
  return [
    { kind: 'detail', tags: detail },
    { kind: 'adjacent', tags: adjacent },
    { kind: 'series', tags: series },
  ].filter((g) => g.tags.length);
});
