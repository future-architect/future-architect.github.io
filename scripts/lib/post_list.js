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
 * @param {boolean} [withThumb]  タイトルの左に小さいサムネを添える (#2230)
 */
const postListItem = (post, itemClass, titleAttr, withThumb = false) => {
  const attr = (titleAttr === undefined ? post.lede : titleAttr) || '';
  const body = `<a href="/${post.path}" title="${attr}">${post.title}</a>`
    + `${newLabel(post.date)}`
    + `<span class="post-meta"><span class="post-meta-date">${post.date.format('YYYY.MM.DD')}</span>${snsLabel(post.permalink)}</span>`;
  if (!withThumb) {
    return `<li class="${itemClass}">${body}</li>`;
  }
  // タイトルと重複するリンクなので、タブ移動と読み上げからは外す。
  // サムネの無い記事は同じ大きさの空き枠を置いて行頭を揃える
  const thumb = post.thumbnail
    ? `<a href="/${post.path}" class="post-list-icon" tabindex="-1" aria-hidden="true"><img src="${post.thumbnail}" alt="" width="48" height="32" loading="lazy"></a>`
    : `<span class="post-list-icon post-list-icon-empty"></span>`;
  return `<li class="${itemClass} post-list-item-thumb">${thumb}<div class="post-list-body">${body}</div></li>`;
};

module.exports = {snsLabel, newLabel, postListItem};
