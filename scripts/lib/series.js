'use strict';

// 索引記事の判定に使うタグ。/series/ の関連タグの先頭にもこれが出る (#3101)
const INDEX_TAG = 'インデックス';

/**
 * 連載記事に前 / 次 と索引へのリンクを出すヘルパー。
 *
 * 連載への所属はフロントマターの series で宣言する。値がそのまま連載名になる。
 *
 *   series: "Go 1.27 リリース連載"
 *
 * 索引記事は series を持ち、かつ インデックス タグを持つ記事とする。
 * どちらも既にある語彙で、連載の索引には元から インデックス を付ける運用がある。
 *
 * 既存記事への series の付与は、本文冒頭の慣習
 * 「[Go 1.27 リリース連載](/articles/20260728a/) の 6 本目です。」を
 * 逆引きして一度だけ機械的に行った。逆引きは言い回しの揺れ（本目 / 回目 /
 * 日目 / 第N弾）や、連載を束ねる年間企画との区別を推測に頼るため、
 * 実行時には残していない。判定はフロントマターだけを見る。
 *
 * 出すのは全何本かまでで、今何本目かは出さない。
 * 本文が名乗る番号（「6本目です」）は、索引記事を1本目に数えるかが
 * 連載ごとに違う。実測では 43連載が数えず / 23連載が数え / 4連載は連載内でも
 * 不統一だった。機械が一方の流儀で番号を振ると、他方の114記事で
 * 本文の「4本目です」と食い違う。番号が無いより害が大きい。
 *
 * 全何本かはこの流儀に依存しないので出せる。索引記事も1本に数える。
 * 索引は目次であると同時に読み物でもあり、そこだけ本編と分ける根拠がない。
 * 本文が「1本目です」と名乗る記事が日付順では2番目に来ることになるが、
 * 番号は出さないので食い違いは表に出ない。
 *
 * ナビに出す題名からは、連載名を名乗り直している部分を落とす。
 * 連載名は見出しに出ているので、前 / 次 の両方で繰り返すと本題が埋もれる。
 *
 *   「Go 1.27 リリース連載：encoding/json/v2」-> 「encoding/json/v2」
 */

// 表記の揺れは題名側にある（「Go1.27リリース連載」「Go 1.27 リリース連載」）。
// 空白は無視し、全角/半角と大小は NFKC で吸収して突き合わせる
const WS = /[\s　]/;
const SEP = /[：:｜|〜～]/;

function sameChar(a, b) {
  return a.normalize('NFKC').toLowerCase() === b.normalize('NFKC').toLowerCase();
}

// 接頭辞を空白を無視して照合し、題名側で消費した位置を返す。合わなければ -1
function consume(title, prefix) {
  let i = 0;
  let j = 0;
  while (j < prefix.length) {
    if (WS.test(prefix[j])) {
      j++;
      continue;
    }
    if (i >= title.length) return -1;
    if (WS.test(title[i])) {
      i++;
      continue;
    }
    if (!sameChar(title[i], prefix[j])) return -1;
    i++;
    j++;
  }
  return i;
}

/**
 * 題名の頭にある連載名を落とす。落とせなければ題名をそのまま返す。
 *
 * 落とす条件を2段に分けているのは、素朴に接頭辞を消すと題名が壊れるため。
 *
 * - 「<連載名>連載」で始まるなら、空白区切りでも落とす。
 *   「Go 1.22リリース連載 net, net/http」-> 「net, net/http」
 * - 「<連載名>」だけで始まるときは、明示的な区切り（：や｜）を要求する。
 *   連載名が題名の文頭の語そのものである場合があり、空白まで許すと
 *   「Cloudflare 採用のアーキテクチャ選定」が「採用のアーキテクチャ選定」になる
 *
 * 区切りの後ろが本題にならない題名は落とさない。索引記事に多い
 * 「CI/CD連載を始めます」は「を始めます」になってしまう。
 * 実データでは620記事中40件が落ち、43件は接頭辞を持ちながら据え置かれた。
 */
function navTitle(title, name) {
  for (const [prefix, allowSpace] of [
    [name + '連載', true],
    [name, false],
  ]) {
    const k = consume(title, prefix);
    if (k < 0) continue;
    const rest = title.slice(k);
    if (!rest) continue; // 題名が連載名そのもの（索引記事に多い）
    if (!(SEP.test(rest[0]) || (allowSpace && WS.test(rest[0])))) continue;
    const stripped = rest.replace(/^[\s　：:｜|〜～]+/, '');
    if (stripped) return stripped;
  }
  return title;
}

/**
 * 系統（バージョン・年で続いていく連載）の前後 (#2383)。
 *
 * 「数字の連続を除いた名前が同じ」連載を同一系統とみなし、数字の数値順に繋ぐ
 * （Go1.26リリース → Go1.27リリース、春の入門祭り2025 → 春の入門祭り2026）。
 * 実データでは11系統48連載がこの規則で繋がり、誤りは無かった。
 *
 * 命名規則で繋がらない継続（改名した企画など）は
 * source/_data/series_succession.yml の next で明示し、
 * 名前が偶然同じ形になるだけの連載は standalone: true で系統から外す
 */
function successionMaps(site, groups) {
  const data = (site.data && site.data.series_succession) || {};
  const famKey = (name) => name.replace(/\d+(?:\.\d+)*/g, '#');
  // 1.27 -> 1027（桁上げ1000）。文字列比較だと 1.9 > 1.27 になる
  // （related_tags.js の versionKey と同じ理由）。名前に数字が複数あれば連結する
  const numKey = (name) =>
    (name.match(/\d+(?:\.\d+)*/g) || [])
      .flatMap((v) => v.split('.'))
      .reduce((acc, n) => acc * 1000 + Number(n), 0);

  const fams = new Map();
  for (const name of groups.keys()) {
    if (data[name] && data[name].standalone) continue;
    const key = famKey(name);
    if (key === name) continue; // 数字を含まない連載は系統を作らない
    if (!fams.has(key)) fams.set(key, []);
    fams.get(key).push(name);
  }
  const nextOf = new Map();
  for (const list of fams.values()) {
    list.sort((a, b) => numKey(a) - numKey(b));
    for (let i = 0; i + 1 < list.length; i++) nextOf.set(list[i], list[i + 1]);
  }
  // 明示された継続は自動導出より優先する
  for (const [name, node] of Object.entries(data)) {
    if (node && typeof node.next === 'string' && groups.has(name) && groups.has(node.next)) {
      nextOf.set(name, node.next);
    }
  }
  const prevOf = new Map();
  for (const [a, b] of nextOf) prevOf.set(b, a);
  return { nextOf, prevOf };
}

/**
 * /series/ の関連タグ。索引記事に付いているタグのうち、**3つ以上の連載に
 * またがり**、かつそのタグの記事の**8割以上が索引記事**のものを返す。
 *
 * 恒例行事の連載（春の入門祭り・夏休み自由研究・秋ブログ週間）は、年ごとの
 * 連載の索引記事に同じタグが付いている。連載名はタグで表さない規則なので、
 * 年をまたぐ企画の名前を持つ語はここにしか出てこない。
 *
 * 索引記事に居合わせただけの主題のタグと分けるのは比の方。3連載以上のタグは
 * 8タグあり、比は 0.83 以上（インデックス・春・夏・秋）と 0.14 以下
 * （Go 16連載・入門 6連載・Terraform 4連載・GoogleCloud / Vue.js / CNCF 3連載）に
 * 割れて、間に何も無い。件数では切れない（Go は索引記事16本で最多）。
 *
 * 並びは連載数の多い順で、同数は初出の古い順（春 → 夏 → 秋）。
 */
const EVENT_MIN_SERIES = 3;
const EVENT_MIN_INDEX_RATIO = 0.8;

function relatedTags(site, indexPaths) {
  const seriesCount = new Map(); // タグ -> そのタグを持つ索引記事の連載数
  const total = new Map(); // タグ -> そのタグの記事数
  const firstSeen = new Map(); // タグ -> 初出の日付
  site.posts.each((post) => {
    const isIndex = indexPaths.has(post.path);
    (post.tags ? post.tags.toArray() : []).forEach((tag) => {
      total.set(tag.name, (total.get(tag.name) || 0) + 1);
      if (isIndex) seriesCount.set(tag.name, (seriesCount.get(tag.name) || 0) + 1);
      const at = firstSeen.get(tag.name);
      if (!at || post.date < at) firstSeen.set(tag.name, post.date);
    });
  });
  return [...seriesCount]
    .filter(([name, n]) => n >= EVENT_MIN_SERIES && n / total.get(name) >= EVENT_MIN_INDEX_RATIO)
    .sort((a, b) => b[1] - a[1] || firstSeen.get(a[0]) - firstSeen.get(b[0]))
    .map(([name]) => name);
}

let cache = null;

function build(site) {
  const groups = new Map(); // 連載名 -> 記事

  site.posts.sort('date', 1).each((post) => {
    if (!post.series) return;
    if (!groups.has(post.series)) groups.set(post.series, []);
    groups.get(post.series).push(post);
  });

  const { nextOf, prevOf } = successionMaps(site, groups);
  // 系統リンクの行き先は索引記事（無ければ先頭の記事）。/series/ 一覧と同じ規則
  const destOf = (name) => {
    const posts = groups.get(name);
    const index = posts.find((p) => p.tags && p.tags.some((t) => t.name === INDEX_TAG));
    return { name, path: (index || posts[0]).path };
  };

  const series = new Map(); // 記事のパス -> その記事から見た連載
  for (const [name, posts] of groups) {
    const index = posts.find((p) => p.tags && p.tags.some((t) => t.name === INDEX_TAG));

    // 落とすのはナビの表示だけ。記事の title そのものは触らない
    const nav = posts.map((p) => ({ path: p.path, title: navTitle(p.title, name) }));

    const prevSeries = prevOf.has(name) ? destOf(prevOf.get(name)) : null;
    const nextSeries = nextOf.has(name) ? destOf(nextOf.get(name)) : null;

    posts.forEach((post, i) => {
      const entry = {
        name,
        total: posts.length,
        index: index && index !== post ? index : null,
        prev: i > 0 ? nav[i - 1] : null,
        next: i < posts.length - 1 ? nav[i + 1] : null,
        prevSeries,
        nextSeries,
      };
      // ナビが既にリンクしている記事。関連記事・被参照記事から落とすのに使う
      entry.linked = new Set(
        [entry.index, entry.prev, entry.next].filter(Boolean).map((p) => p.path),
      );
      series.set(post.path, entry);
    });
  }

  const all = [...groups.values()].flat();
  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;

  const indexPaths = new Set(
    [...groups.values()]
      .map((posts) => posts.find((p) => p.tags && p.tags.some((t) => t.name === INDEX_TAG)))
      .filter(Boolean)
      .map((p) => p.path),
  );

  return {
    byPath: series,
    relatedTags: relatedTags(site, indexPaths),
    list: [...groups].map(([name, posts]) => {
      const index = posts.find((p) => p.tags && p.tags.some((t) => t.name === INDEX_TAG));
      return {
        name,
        total: posts.length,
        // 直近の投稿だけを見たい呼び出し側（人気の連載 #2855）のために本体を渡す
        posts,
        // 年ごとの著者数は連載をまたいで重複するため、数ではなく名前で持つ
        authors: [...authorsOf(posts)],
        index: index || posts[0],
        first: posts[0].date,
        latest: posts[posts.length - 1].date,
      };
    }),
    stats: {
      total: countOf(all),
      recent: countOf(all.filter((p) => p.date.valueOf() >= oneYearAgo)),
    },
  };
}

// 共著の旧記事は author が配列（category_chart_helpers.js と同じ扱い）
function authorsOf(posts) {
  const authors = new Set();
  posts.forEach((p) => [].concat(p.author || []).forEach((a) => authors.add(a)));
  return authors;
}

/**
 * /series/ のページ統計 (#2572)。累計と直近1年を同じ形で返す。
 *
 * 著者はユニークで数える。連載の記事645本を延べで数えると600名を超えるが、
 * 同じ人が何本もの連載に出るため、実際に連載を書いた人は175名まで減る。
 */
function countOf(posts) {
  return {
    series: new Set(posts.map((p) => p.series)).size,
    posts: posts.length,
    authors: authorsOf(posts).size,
  };
}

/** 記事から見た連載。連載に属さない記事は null */
function seriesOf(site, post) {
  if (!cache) cache = build(site);
  return cache.byPath.get(post.path) || null;
}

/** 連載の一覧。更新が新しい順 */
function allSeries(site) {
  if (!cache) cache = build(site);
  return cache.list.slice().sort((a, b) => b.latest - a.latest || (a.name < b.name ? -1 : 1));
}

/** /series/ の統計。{total, recent} それぞれ {series, posts, authors} */
function seriesStats(site) {
  if (!cache) cache = build(site);
  return cache.stats;
}

/** /series/ の関連タグ。索引タグと恒例行事の企画名 */
function seriesRelatedTags(site) {
  if (!cache) cache = build(site);
  return cache.relatedTags;
}

const NONE = new Set();

/**
 * 連載ナビが既にリンクしている記事のパス（索引・前・次）。関連記事から落とす。
 *
 * 関連記事はどれを見せるかを選ぶ推薦なので、すぐ上のナビで出した記事に
 * 枠を使う理由がない。被参照記事は逆に、実際に張られたリンクの記録なので
 * 重複しても落とさない。
 */
function navLinkedPaths(site, post) {
  const s = seriesOf(site, post);
  return s ? s.linked : NONE;
}

module.exports = {
  INDEX_TAG,
  seriesOf,
  navLinkedPaths,
  allSeries,
  seriesStats,
  seriesRelatedTags,
};
