'use strict';

const {getSNSCnt} = require('./sns');

/**
 * 記事リストの li マークアップを組み立てる。
 *
 * 「関連記事」「この記事を参照している記事」「よく読まれている記事」で
 * 別々に書かれていて表示形式がずれていたため、ここに寄せる。
 *
 * 並びはタイトル -> NEW -> (日付 / 反響) の順。読み手は「何の記事か」を
 * 見てから「古くないか」「評判はどうか」を確認するため、
 * 判断の順序に合わせている。
 */

// 反響が0のときは何も出さない。0と表示されると寂しく見えるため
const snsLabel = permalink => {
  const n = getSNSCnt(permalink);
  return n > 0 ? `<span class="snscount">&#9825;${n}</span>` : '';
};

// 公開から30日以内なら NEW を付ける
const newLabel = date => {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - 30);
  return threshold.toISOString() <= date.toISOString()
    ? `<span class="newitem">NEW</span>`
    : '';
};

/**
 * @param {object} post          Hexo の post
 * @param {string} itemClass     li に付けるクラス
 * @param {string} [titleAttr]   a の title 属性。省略時は lede
 */
const postListItem = (post, itemClass, titleAttr) => {
  const attr = (titleAttr === undefined ? post.lede : titleAttr) || '';
  return `<li class="${itemClass}"><a href="/${post.path}" title="${attr}">${post.title}</a>`
    + `${newLabel(post.date)}`
    + `<span class="post-meta"><span class="post-meta-date">${post.date.format('YYYY.MM.DD')}</span>${snsLabel(post.permalink)}</span></li>`;
};

/**
 * サムネ付きのカード1枚。row g-4 の中に並べる前提の col ごと返す。
 * 「よく読まれている記事」系のセクション（ホームのランキング・
 * カテゴリ / タグ / 著者 / 年ページ）で共用する。
 * マークアップはホームの「連載から探す」と同じカード
 */
const postPanel = post => {
  const thumb = post.thumbnail
    ? `<a href="/${post.path}" title="${post.title}" class="img_wrap panel-thumb"><img src="${post.thumbnail}" alt="" width="200" height="135" loading="lazy"></a>`
    : '';
  return `<div class="col-12 col-md-6"><div class="article-card post-panel h-100">${thumb}`
    + `<div class="panel-body"><a href="/${post.path}" class="panel-title">${post.title}</a>`
    + `<div class="panel-meta">${post.date.format('YYYY.MM.DD')}${snsLabel(post.permalink)}</div>`
    + `</div></div></div>`;
};

module.exports = {snsLabel, newLabel, postListItem, postPanel};
