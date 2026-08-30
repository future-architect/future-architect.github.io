'use strict';

const { getSNSCnt } = require('./sns');

// 公開から30日以内かどうか。
//
// **NEW を出すのはランキングだけ**（呼び出し側が withNew で渡す、#2788）。
// 関連記事は関連度順、参照している記事は張られたリンクの記録で、どちらも
// 新しさが並びの理由ではない。実測では参照している記事の92%が NEW
// （12ページ中10ページが全行 NEW）で、しかも並びが日付降順なので二重だった。
// 関連記事は逆に全期間で0.5%しか出ず、出るのは同じ連載の同時期の記事。
// ランキングは PV 順で新しさと無関係なので、「まだ読んでいないかもしれない
// 新顔」の合図として働く（74行中14行）
const isRecent = (date) => {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - 30);
  return threshold.toISOString() <= date.toISOString();
};

/**
 * 記事の行1件。「関連記事」「この記事を参照している記事」「よく読まれている記事」が
 * 同じ形を共有する。markup は _partial/post-list-item.ejs が1箇所で持ち、
 * ここは渡すデータを整えるだけ (#3097)。
 *
 * @param {object} ctx           呼び出し元のテンプレートのローカル（helper の this）。
 *                               lib の関数は this を持たないので partial を引くために受け取る
 * @param {object} post          Hexo の post
 * @param {string} itemClass     li に付けるクラス
 * @param {object} [opts]
 * @param {string} [opts.titleAttr]  a の title 属性。省略時は lede
 * @param {boolean} [opts.withThumb] タイトルの左に小さいサムネを添える (#2230)
 * @param {{html: string, className: string}} [opts.rankMark] 行頭に出す順位の丸 (#2249)
 * @param {boolean} [opts.withNew]   公開30日以内なら NEW を出す (#2788)
 */
const postListItem = (
  ctx,
  post,
  itemClass,
  { titleAttr, withThumb = false, rankMark = null, withNew = false } = {},
) =>
  ctx
    .partial('_partial/post-list-item', {
      post,
      itemClass,
      titleAttr,
      withThumb,
      rankMark,
      isNew: withNew && isRecent(post.date),
      snsCount: getSNSCnt(post.permalink),
    })
    .trim();

module.exports = { postListItem };
