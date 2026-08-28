'use strict';

const { getSNSCnt } = require('./sns');

/**
 * 記事リストの li マークアップを組み立てる。
 *
 * 「関連記事」「この記事を参照している記事」「よく読まれている記事」で
 * 別々に書かれていて表示形式がずれていたため、ここに寄せる。
 *
 * 並びはタイトル -> NEW -> (日付 / 反響) の順。読み手は「何の記事か」を
 * 見てから「古くないか」「評判はどうか」を確認するため、
 * 判断の順序に合わせている。NEW を出すかは呼び出し側が決める（newLabel の注記）。
 */

// 反響が0のときは何も出さない。0と表示されると寂しく見えるため。
// ♡ だけ span で包むのは、記号は少し大きくしないと線が潰れる一方、
// 数字は日付と同じ大きさに揃えたいため（#2453）
const snsLabel = (permalink) => {
  const n = getSNSCnt(permalink);
  return n > 0
    ? `<span class="snscount"><span class="snscount-icon">&#9825;</span>${n}</span>`
    : '';
};

// 公開から30日以内なら NEW を付ける。
//
// **出すのはランキングだけ**（呼び出し側が withNew で渡す、#2788）。
// 関連記事は関連度順、参照している記事は張られたリンクの記録で、どちらも
// 新しさが並びの理由ではない。実測では参照している記事の92%が NEW
// （12ページ中10ページが全行 NEW）で、しかも並びが日付降順なので二重だった。
// 関連記事は逆に全期間で0.5%しか出ず、出るのは同じ連載の同時期の記事。
// ランキングは PV 順で新しさと無関係なので、「まだ読んでいないかもしれない
// 新顔」の合図として働く（74行中14行）
const newLabel = (date) => {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - 30);
  return threshold.toISOString() <= date.toISOString() ? `<span class="newitem">NEW</span>` : '';
};

/**
 * サムネの箱。索引記事の表（thumb タグ #2790）も同じ markup を使う。
 *
 * 同じ行のタイトルと同じ行き先のリンクなので、タブ移動と読み上げからは外す (#2845)。
 * サムネの無い記事は空文字を返す。行の左端を揃える必要がある一覧・ランキングだけ、
 * 呼び出し側（postListItem）が同じ大きさの空き枠に差し替える
 */
const thumbIcon = (post) =>
  post.thumbnail
    ? `<a href="/${post.path}" class="post-list-icon" tabindex="-1" aria-hidden="true"><img src="${post.thumbnail}" alt="" width="72" height="48" loading="lazy"></a>`
    : '';

/**
 * @param {object} post          Hexo の post
 * @param {string} itemClass     li に付けるクラス
 * @param {object} [opts]
 * @param {string} [opts.titleAttr]  a の title 属性。省略時は lede
 * @param {boolean} [opts.withThumb] タイトルの左に小さいサムネを添える (#2230)
 * @param {{html: string, className: string}} [opts.rankMark]
 *        行頭に出す順位の丸。ランキング用 (#2249)。中身も段のクラスも呼び出し側が決める。
 *        何位がどの段か・数字を出すか記号にするかはランキング側の都合なので、
 *        ここは受け取った通りに包むだけにしている (#2681)
 * @param {boolean} [opts.withNew]   NEW を出す (#2788)
 */
const postListItem = (
  post,
  itemClass,
  { titleAttr, withThumb = false, rankMark = null, withNew = false } = {},
) => {
  const attr = (titleAttr === undefined ? post.lede : titleAttr) || '';
  const rankLabel = rankMark
    ? `<span class="post-list-rank${rankMark.className ? ' ' + rankMark.className : ''}">${rankMark.html}</span>`
    : '';
  const body =
    `<a href="/${post.path}" title="${attr}">${post.title}</a>` +
    `${withNew ? newLabel(post.date) : ''}` +
    // 関連記事・ランキングの日付は鮮度の目安なので年月まで (#2404)。
    // 日まで出すのは、日付が並びの座標になる時系列リストと記事自身だけ
    `<span class="post-meta"><span class="post-meta-date">${post.date.format('YYYY.MM')}</span>${snsLabel(post.permalink)}</span>`;
  if (!withThumb) {
    return `<li class="${itemClass}">${rankLabel}${body}</li>`;
  }
  // 行の左端を揃えるため、サムネの無い記事はここでだけ同じ大きさの空き枠に置き換える
  const thumb = thumbIcon(post) || `<span class="post-list-icon post-list-icon-empty"></span>`;
  return `<li class="${itemClass} post-list-item-thumb">${rankLabel}${thumb}<div class="post-list-body">${body}</div></li>`;
};

module.exports = { snsLabel, newLabel, postListItem, thumbIcon };
