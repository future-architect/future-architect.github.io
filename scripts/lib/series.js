'use strict';

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
    if (WS.test(prefix[j])) { j++; continue; }
    if (i >= title.length) return -1;
    if (WS.test(title[i])) { i++; continue; }
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
  for (const [prefix, allowSpace] of [[name + '連載', true], [name, false]]) {
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

let cache = null;

function build(site) {
  const groups = new Map(); // 連載名 -> 記事

  site.posts.sort('date', 1).each(post => {
    if (!post.series) return;
    if (!groups.has(post.series)) groups.set(post.series, []);
    groups.get(post.series).push(post);
  });

  const series = new Map(); // 記事のパス -> その記事から見た連載
  for (const [name, posts] of groups) {
    const index = posts.find(p => p.tags && p.tags.some(t => t.name === 'インデックス'));

    // 落とすのはナビの表示だけ。記事の title そのものは触らない
    const nav = posts.map(p => ({path: p.path, title: navTitle(p.title, name)}));

    posts.forEach((post, i) => {
      const entry = {
        name,
        total: posts.length,
        index: index && index !== post ? index : null,
        prev: i > 0 ? nav[i - 1] : null,
        next: i < posts.length - 1 ? nav[i + 1] : null
      };
      // ナビが既にリンクしている記事。関連記事・被参照記事から落とすのに使う
      entry.linked = new Set(
        [entry.index, entry.prev, entry.next].filter(Boolean).map(p => p.path)
      );
      series.set(post.path, entry);
    });
  }

  return {byPath: series, list: [...groups].map(([name, posts]) => {
    const index = posts.find(p => p.tags && p.tags.some(t => t.name === 'インデックス'));
    return {
      name,
      total: posts.length,
      index: index || posts[0],
      first: posts[0].date,
      latest: posts[posts.length - 1].date
    };
  })};
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

module.exports = {seriesOf, navLinkedPaths, allSeries};
