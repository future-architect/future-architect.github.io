'use strict';

const fs = require('fs');
const { snsLabel } = require('./lib/post_list');
const { allSeries } = require('./lib/series');

const load = JSON.parse(fs.readFileSync('ga4_pv.json', 'utf-8'));
const map = new Map();
load.pv.forEach((obj) => {
  map.set(obj.path, obj);
});

const getGA4PV = (url) => map.get(url)?.pv || 0;

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

// トップの「人気のタグ」(#2358)。以前は全期間のSNSシェア合計順で、
// 古い大型タグが上位に固定されいまの人気を反映しなかった。
// 公開が1年以内の記事の PV 合計で選ぶ（直近1年の記事はシェア数の
// 積み上がりが薄く、PV は GA4 の実測が全記事にあるため信号が強い）。
// 直近3本未満のタグは、話題の勢いではなく単発のバズなので出さない
// （「3件あれば選択肢として成立する」の related_tags と同じ基準）
hexo.extend.helper.register('recent_popular_tags', function (limit = 10, minRecent = 3) {
  const cacheKey = `${limit}:${minRecent}:${this.site.posts.length}`;
  if (popularTagsCache.has(cacheKey)) return popularTagsCache.get(cacheKey);
  const YEAR = 365 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const tags = this.site.tags
    .map((tag) => {
      const recent = tag.posts.toArray().filter((p) => now - p.date.valueOf() <= YEAR);
      return {
        name: tag.name,
        path: tag.path,
        count: tag.length,
        recent: recent.length,
        pv: recent.reduce((sum, p) => sum + getGA4PV('/' + p.path), 0),
      };
    })
    .filter((t) => t.recent >= minRecent && t.pv > 0)
    // 同点は名前で決める（決着が無いとビルドごとに並びが変わる）
    .sort((a, b) => b.pv - a.pv || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .slice(0, limit);
  popularTagsCache.set(cacheKey, tags);
  return tags;
});

// 検索窓のパネルの「人気の連載」(#2855)。物差しは人気のタグと揃える。
// 同じ面に並ぶ3つの入口が別々の基準で選ばれていると、どれが「いま」を
// 指しているのか読者には区別できない。
// 行き先は索引記事（無ければ1本目）で、/series/ の一覧と同じ規則
const popularSeriesCache = new Map();

hexo.extend.helper.register('recent_popular_series', function (limit = 6, minRecent = 3) {
  const cacheKey = `${limit}:${minRecent}:${this.site.posts.length}`;
  if (popularSeriesCache.has(cacheKey)) return popularSeriesCache.get(cacheKey);
  const YEAR = 365 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const series = allSeries(this.site)
    .map((s) => {
      const recent = s.posts.filter((p) => now - p.date.valueOf() <= YEAR);
      return {
        name: s.name,
        path: s.index.path,
        total: s.total,
        recent: recent.length,
        pv: recent.reduce((sum, p) => sum + getGA4PV('/' + p.path), 0),
      };
    })
    .filter((s) => s.recent >= minRecent && s.pv > 0)
    // 同点は名前で決める（決着が無いとビルドごとに並びが変わる）
    .sort((a, b) => b.pv - a.pv || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .slice(0, limit);
  popularSeriesCache.set(cacheKey, series);
  return series;
});

// 推薦の件数は記事数から決める。推薦が全記事の半分を超えると
// 一覧の並べ替えにしかならず、新着とほぼ同じ顔ぶれになるため、
// 2件には4本以上、4件には8本以上、6件には12本以上を要求する (#2173 / #2272)
function recommendLimit(count) {
  if (count <= 3) return 0;
  if (count <= 7) return 2;
  if (count <= 11) return 4;
  return 6;
}

// 指定した記事の中から PV の多い順に取り出す。カテゴリ・タグの一覧ページで
// 「よく読まれている記事」を出すのに使う（#2033 / #2034）。
// limit を省略すると記事数に応じた件数になる。
// decay に 'linear' を渡すと経過年ペナルティが線形（≒年平均PV）になる
hexo.extend.helper.register('popular_posts_in', function (posts, limit, decay) {
  if (limit === undefined) limit = recommendLimit(posts.length);
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

  // マークアップはホームの「連載から探す」と同じカード。2列で並べる
  const cards = ranked
    .map(({ post }) => {
      const thumb = post.thumbnail
        ? `<a href="/${post.path}" title="${post.title}" class="thumb-link panel-thumb"><img src="${post.thumbnail}" alt="" width="200" height="135" loading="lazy"></a>`
        : '';
      return (
        `<div class="col-12 col-md-6"><div class="article-card post-panel h-100">${thumb}` +
        `<div class="panel-body"><a href="/${post.path}" class="panel-title">${post.title}</a>` +
        // 推薦カードの日付は鮮度の目安なので年月まで (#2404)
        `<div class="panel-meta">${post.date.format('YYYY.MM')}${snsLabel(post.permalink)}</div>` +
        `</div></div></div>`
      );
    })
    .join('');

  return `<div class="row g-4">${cards}</div>`;
});
