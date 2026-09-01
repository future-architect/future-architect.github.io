'use strict';

const { postListItem } = require('./lib/post_list');
const { allSeries } = require('./lib/series');
const { getGA4PV } = require('./lib/ga4');

// 実測値が無いときは 0 を返す。以前は 100 を返していたが、実際に pv が 100 の
// 記事も 55 件あり、表示上どちらか区別できなかった。公開直後の記事に
// 架空の「100 View」が出るのは、読了時間を出さないのと同じ理由で避けたい
hexo.extend.helper.register('get_ga4_pv', (url) => {
  const pv = getGA4PV('/' + url);
  return pv > 0 ? pv.toLocaleString() : '';
});

// 全ページのヘッダー（検索窓のパネル #2791）から呼ぶので結果を持ち回る。
// 714タグ×所属記事を毎ページ舐めると、その分だけビルドが伸びる。
// 記事数が変わったら作り直すため、server での編集にも追随する
const popularTagsCache = new Map();

// トップの「人気のタグ」(#2358)。
// **物差しはランキング記事・人気の連載と同じ経過年ペナルティ** (#2855)。
// 以前は「直近1年に公開された記事の PV 合計」で、古さで減点する仕組みが無く
// 1年の窓を出た瞬間に候補から消えていた。窓を外して1本ずつ 1/(1+経過年^2) で
// 割れば、境目で顔ぶれが飛ばず、新しさと読まれ方が同じ式の中で釣り合う。
//
// **連載と違って本数では割らない。** 連載の √本数 は「連載の規模」を薄める
// ためのものだが、タグの本数は主題の広さで、集合の大きさそのものが
// 「このブログの中心にある話題か」を表す。実測でも √本数 で割ると
// 3本の「構造化ログ」が3位に入り、265本の Go は6位まで落ちて、
// 入口として薄いタグが並ぶ（タグは3〜265本と幅が連載の10倍あるので、
// 同じ割り方でも効きが強く出る）。
//
// 3本未満のタグは出さない。「3件あれば選択肢として成立する」の related_tags と
// 同じ基準で、行き先として薄いものを入口に置かない
hexo.extend.helper.register('recent_popular_tags', function (limit = 10, minPosts = 3) {
  const cacheKey = `${limit}:${minPosts}:${this.site.posts.length}`;
  if (popularTagsCache.has(cacheKey)) return popularTagsCache.get(cacheKey);
  const YEAR = 365 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const score = (post) => {
    const years = (now - post.date.valueOf()) / YEAR;
    return getGA4PV('/' + post.path) / (1 + years * years);
  };
  const tags = this.site.tags
    .map((tag) => {
      const posts = tag.posts.toArray();
      return {
        name: tag.name,
        path: tag.path,
        count: tag.length,
        pv: posts.reduce((sum, p) => sum + getGA4PV('/' + p.path), 0),
        score: posts.reduce((sum, p) => sum + score(p), 0),
      };
    })
    .filter((t) => t.count >= minPosts && t.score > 0)
    // 同点は名前で決める（決着が無いとビルドごとに並びが変わる）
    .sort((a, b) => b.score - a.score || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .slice(0, limit);
  popularTagsCache.set(cacheKey, tags);
  return tags;
});

// ヘッダーのドロップダウンとサイドバーの「人気の連載」(#2855)。
// **物差しはランキング記事（popular_posts_in）・人気のタグと同じ経過年ペナルティ**。
// 以前は「直近1年に公開された記事の PV 合計」で、古さで減点する仕組みは無く
// 1年の窓を出た瞬間に候補から消えていた。窓の中では逆に古い方が有利で
// （PV を積む時間があるため）、10か月前の連載が最新の連載を上回っていた。
// 窓を外して1本ずつ 1/(1+経過年^2) で割れば、境目で顔ぶれが飛ばず、
// 新しさと読まれ方が同じ式の中で釣り合う。
// 行き先は索引記事（無ければ1本目）で、/series/ の一覧と同じ規則
const popularSeriesCache = new Map();

hexo.extend.helper.register('popular_series', function (limit = 6, minPosts = 3) {
  const cacheKey = `${limit}:${minPosts}:${this.site.posts.length}`;
  if (popularSeriesCache.has(cacheKey)) return popularSeriesCache.get(cacheKey);
  const YEAR = 365 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  // popular_posts_in と同じ式（1年落ち=1/2、2年=1/5、4年=1/17）。
  // 連載は記事の集まりなので、1本ずつ割ってから足す
  const score = (post) => {
    const years = (now - post.date.valueOf()) / YEAR;
    return getGA4PV('/' + post.path) / (1 + years * years);
  };
  // **足したあと √本数 で割る。** 単純な合計だと本数がそのまま効き、27本の
  // 「春の入門祭り2025」のような大型連載が上位を占める。本数が多い連載は
  // 実際に盛り上がっているので有利のままにしたいが、効きは弱めたい。
  // √で割ると効きが指数の半分（N から √N）になり、27本と6本の差は
  // 4.5倍から2.1倍に縮む。平均にすると本数の効きが完全に消えるので採らない
  const series = allSeries(this.site)
    .map((s) => ({
      name: s.name,
      path: s.index.path,
      total: s.total,
      pv: s.posts.reduce((sum, p) => sum + getGA4PV('/' + p.path), 0),
      score: s.posts.reduce((sum, p) => sum + score(p), 0) / Math.sqrt(s.total),
    }))
    .filter((s) => s.total >= minPosts && s.score > 0)
    // 同点は名前で決める（決着が無いとビルドごとに並びが変わる）
    .sort((a, b) => b.score - a.score || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .slice(0, limit);
  popularSeriesCache.set(cacheKey, series);
  return series;
});

// 推薦の件数は記事数から決める。推薦が全記事の半分を超えると
// 一覧の並べ替えにしかならず、新着とほぼ同じ顔ぶれになるため、
// 2件には4本以上、4件には8本以上、6件には12本以上を要求する (#2173 / #2272)。
// extended を渡した呼び出し（期間ページのおかわり #3144）だけ 10件の段を持ち、
// 比は同じなので 20本以上を要求する
function recommendLimit(count, extended) {
  if (count <= 3) return 0;
  if (count <= 7) return 2;
  if (count <= 11) return 4;
  if (extended && count >= 20) return 10;
  return 6;
}

// 指定した記事の中から PV の多い順に取り出す。カテゴリ・タグの一覧ページで
// 「よく読まれている記事」を出すのに使う（#2033 / #2034）。
// limit を省略すると記事数に応じた件数になる。
// decay に 'linear' を渡すと経過年ペナルティが線形（≒年平均PV）になる。
// foldAfter を渡すと、その件数までを開いた状態で置き、残りを details で畳む
// （#3144。/articles/ と /articles/yyyy/ だけ）
hexo.extend.helper.register('popular_posts_in', function (posts, limit, decay, foldAfter = 0) {
  if (limit === undefined) limit = recommendLimit(posts.length, foldAfter > 0);
  if (limit === 0) return '';
  // PV は累積なので、古い記事ほど有利になる。経過年数で割って、
  // 何年もかけて積んだ数字と最近読まれている数字を並べられるようにする。
  // 分母を 1+... にしているのは、公開直後の記事で 0 除算にしないため。
  // 年数のペナルティは線形だと弱く、累積PVの大きい古典が上位に残り続けた。
  // 2乗にする（1年落ち=1/2、2年=1/5、4年=1/17）。著者ページで古い記事
  // ばかりが並ぶと、その著者が最近書けていないように見えてしまうし、
  // この業界では数年前の記事は十分古い。効きの強さをページの種類
  // （カテゴリ・タグ・著者）で分けることはしない (#2174)。
  // 例外は全期間アーカイブ (#2407)。ここは「歴代の定番」を見せる場なので
  // 線形（1年=1/2、4年=1/5）に緩め、露出期間の不公平だけを補正して古典を残す。
  // 2乗のままだと実質直近人気になり、ホームの年間人気と顔ぶれが完全に重複した
  const YEAR = 365 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const score = (post) => {
    const years = (now - post.date.valueOf()) / YEAR;
    const penalty = decay === 'linear' ? 1 + years : 1 + years * years;
    return getGA4PV('/' + post.path) / penalty;
  };

  const ranked = posts
    .map((post) => ({ post, pv: getGA4PV('/' + post.path), score: score(post) }))
    .filter((x) => x.pv > 0)
    // 同点の決着が無いとビルドごとに並びが変わる
    .sort((a, b) => b.score - a.score || (a.post.path < b.post.path ? -1 : 1))
    .slice(0, limit);

  if (ranked.length === 0) return '';

  // 行はホームのランキング・関連記事と同じ部品 (#3057)。パネル（panel-card）は
  // #2892 以降「連載・特設」の名札を持つ部品なので、記事1本には使わない。
  // 題を1行の塊にして日付・♡を次の行に落とすのは .nav a（display: block）。
  // ランキング・関連記事・被参照記事も .nav の中に置いて同じ形にしている。
  // 列は CSS（.popular-in-list）が持つ
  const list = (part) =>
    `<ul class="nav popular-in-list">${part
      .map(({ post }) => postListItem(this, post, 'featured-posts-item', { withThumb: true }))
      .join('')}</ul>`;

  // 残りが1件だけなら畳む意味がないので開いたまま出す（ランキングと同じ扱い）
  if (foldAfter === 0 || ranked.length <= foldAfter + 1) return list(ranked);

  // 畳みは details。文言・見た目はホームのランキングの2段目と同じ (#2249)
  return `${list(ranked.slice(0, foldAfter))}
<details class="popular-in-more">
  <summary>残り ${ranked.length - foldAfter}本を表示</summary>
  ${list(ranked.slice(foldAfter))}
</details>`;
});
