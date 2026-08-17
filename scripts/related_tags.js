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
 * 出すのは3種類の関係で、この順に並べる。
 *
 *   1. 共起（発見）      … 一緒に付いている。移動すると新しい記事に出会える
 *   2. 絞り込み (#2569)  … 移動先の記事が全部このタグにもある（完全な部分集合）
 *   3. 系列（名前）      … Go1.26 と Go1.27 のような版違い
 *
 * 2 を別の群にしているのは、共起と枠を奪い合わせないため。スコアは
 * 共起数 × log(1 + lift) で、lift は移動先が小さいほど跳ねる（2本のタグで50倍
 * 前後）。同じ列に混ぜると 2本のタグが CI/CD や Vite のような中堅を8枠から
 * 追い出す。実データで測ると 199件が入る代わりに 79件が消えた。
 * 別の群にすれば消えるものは0件になる。
 *
 * 絞り込みを出すのは6本以上のタグ（NARROWING_MIN_POSTS）。移動先に新しい記事が
 * 無くても、22本のDynamoDBから2本のDynamoDBStreamsへ絞れること自体に価値がある。
 * 6本からにしたのは、PCの画面に一覧が5件ほど収まるため。それを超えると
 * スクロールして探すことになり、絞り込む先があるかどうかが効いてくる。
 *
 * ただし共起では「同じ仲間だが同じ記事には付かない」関係が見えない。
 * Go1.26 と Go1.27 の共起は0本で、バージョン違いは排他的に付くため原理的に
 * 検出できない。そこで名前の形（末尾の数字を外した接頭辞が一致する）から
 * 兄弟を拾い、共起の結果の後ろに置く。
 *
 * 並びを共起→兄弟にしているのは、先頭の一等地を非自明な発見に使うため
 * (#2357)。Terraform → IaC のような共起の関係は見て初めて気づくが、
 * Go1.26 の隣の Go1.27 は名前だけで関係が自明なので、末尾でも見落とされない。
 * 逆に先頭へ置くと、兄弟が多いタグ（Go1.xx は11個）で一等地を占拠して
 * 発見を後ろへ押し出してしまう。
 *
 * 名前の一致は共起と違って決定的な関係なので、件数による裏付けは要らない。
 * 兄弟が1つでも、移動先が1本でも出す。読者にとって Go1.26 の隣に Go1.27 が
 * あるのは自明で、薄い結果でも期待が裏切られない。
 * 接頭辞そのもののタグ（無印: Go / GoogleCloudNext）も同じ系列に含める
 * (#2355)。親ページに子の一覧が出て、子ページには親が系列の先頭に出る。
 * 実データでは Go / インターン / GoogleCloudNext / Terraform / PostgreSQL /
 * NLP の6系列（無印含む）が拾え、束ね間違いは無かった。
 *
 * 兄弟は表示数の上限にも数えない。共起と枠を奪い合う理屈が無いためで、
 * 最も多い無印 Go のページでも兄弟12（Go1.16〜1.27）なので、
 * 際限なく増えることもない。
 *
 * リンク先は単にそのタグのページで、2タグの AND 検索はしない。
 * 組み合わせの数だけページが増えるうえ、読者の行動としても
 * 「Terraform を見たが IaC 全体も見てみるか」という乗り換えに近い。
 */

// 1ページに表示する記事数（_config.yml の per_page と揃える）
const PER_PAGE = 25;
// 共起から出すタグの数。兄弟はこの枠に数えず、全部出す
const MAX_CO_TAGS = 8;
// 共起がこれ未満なら関係を測れない
const MIN_CO_OCCURRENCE = 2;
// 移動先の記事がこれ未満だと、クリックしても得るものが少ない。
// 3件あれば選択肢として成立する（絞り込みの群には掛けない。あちらは
// 移動先の少なさが目的なので、共起2本＝移動先2本でも出す #2569）
const MIN_DESTINATION_POSTS = 3;
// 「新しい記事」がこれ未満なら、移動しても既に見た記事しか出てこない
const MIN_NEW_POSTS = 2;
// 絞り込みの群を出すタグの大きさ。これ以下なら一覧を眺めるだけで済む (#2569)
const NARROWING_MIN_POSTS = 5;
// 絞り込みの群の上限。実データでは102ページ中100ページが12件以内（中央値2件）で、
// 超えるのは Go の39件と GoogleCloud の22件だけ。件数の多い順に並べるので、
// 切れるのは2〜3本の細いタグになる。12 は兄弟群の最大（Go1.16〜1.27 の12件）と
// 同じ大きさで、この長さまでは表示側が受け止められると分かっている
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

  return { total, path, families, partners, postCount: site.posts.length };
}

hexo.extend.helper.register('related_tags', function (tagName) {
  if (!cache) cache = build(this.site);
  const { total, path, families, partners, postCount } = cache;

  const own = total.get(tagName);
  if (!own) return [];

  // 同じ系列のタグ。共起では見えない関係なので、件数で足切りせず全部出す。
  // 無印タグ（Go / GoogleCloudNext）のページでは自分が接頭辞そのもの (#2355)
  const stem = family(tagName) || (families.has(tagName) ? tagName : null);
  const siblings = (stem ? families.get(stem) || [] : [])
    .filter((name) => name !== tagName)
    .map((name) => ({
      name,
      path: path.get(name),
      posts: total.get(name),
      // 無印（親）はバージョンを持たないので先頭に置く。系列全体への入口のため
      version: VERSIONED.test(name) ? versionKey(name) : Infinity,
      sibling: true,
    }))
    .sort((a, b) => b.version - a.version); // 新しいバージョンを先に
  const siblingNames = new Set(siblings.map((s) => s.name));

  // 移動先に新しい記事が1本しか無い相手を出すかどうか。1ページに収まるタグでは
  // スクロールすれば全部見えるので、読者が求めるのは新しい記事に出会えるタグの方。
  // 1ページを超えるタグなら、わずかでも絞れることに意味がある。
  // 新しい記事が0本（完全な部分集合）の相手は下の絞り込みの群が受け持つ
  const allowThinNew = own > PER_PAGE;

  const candidates = (partners.get(tagName) || [])
    .map(([name, n]) => {
      const dest = total.get(name) || 0;
      return {
        name,
        path: path.get(name),
        co: n,
        posts: dest,
        fresh: dest - n, // 移動先にあって、いま見ているタグには無い記事数
        lift: (n * postCount) / (own * dest),
      };
    })
    // 兄弟は上で拾っているので重複させない
    .filter((r) => !siblingNames.has(r.name) && r.co >= MIN_CO_OCCURRENCE);

  // 絞り込み (#2569)。移動先の記事が全部このタグにもある（fresh が0）関係。
  // 新しい記事に出会えないが、大きなタグの中から目的の話題へ降りる道になる。
  // 共起の8枠とは別に数える（枠を奪い合わせない）。件数の多い順に上限まで
  const narrowing =
    own > NARROWING_MIN_POSTS
      ? candidates
          .filter((r) => r.fresh === 0)
          .map((r) => ({ ...r, narrowing: true }))
          .sort((a, b) => b.posts - a.posts || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
          .slice(0, MAX_NARROWING_TAGS)
      : [];

  const rows = candidates.filter(
    (r) =>
      r.fresh > 0 && r.posts >= MIN_DESTINATION_POSTS && (allowThinNew || r.fresh >= MIN_NEW_POSTS),
  );

  // 同点は名前で決める（決着が無いとビルドごとに並びが変わる）
  const score = (r) => r.co * Math.log(1 + r.lift);
  rows.sort((a, b) => score(b) - score(a) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return rows.slice(0, MAX_CO_TAGS).concat(narrowing).concat(siblings);
});
