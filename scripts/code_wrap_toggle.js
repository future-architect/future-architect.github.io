'use strict';

/**
 * 横に溢れるコードブロックに「折り返す」トグルを足すフィルター (#2752)。
 *
 * チェックボックスと label だけで作り、JS は使わない。ランキングのタブと
 * 同じ手（`input:checked` と兄弟結合子）で、切り替えは CSS が受け持つ。
 * クリップボードを触るコピー機能と違い、折り返しは JS 無しで実装できる。
 *
 * **溢れるブロックにだけ出す。** 全記事のコードブロック 7,879 個のうち、
 * 幅375pxの本文列に収まらないのは 5,273 個（67%）。残りはどの幅でも1行に
 * 収まるので、押しても何も起きないトグルになる。
 *
 * 判定は描画後の HTML から最長行を測って行う。フェンスの記法（``` と ~~~、
 * csv / diff_* の自前描画）に依らず、実際に出た行を見るため。
 *
 * ラベルに絵柄を入れないのは、アイコンの辞書を `_partial/svg-icon.ejs` が
 * 1箇所で持つ決まりのため (#2774)。フィルターからは辞書を引けない。
 */

// 等幅13pxの字送り。ui-monospace が当たる SF Mono / Cascadia Code /
// Menlo / Liberation Mono はいずれも 0.6em 前後。Consolas は 0.55em で
// もう少し入るが、狭い側に見積もっておけば足りない方には外れない
const CHAR_PX = 7.8;
// tab-size: 2em（theme-styles.styl）。タブは次の 26px の位置まで進む。
// Go のインデントはタブなので、1文字ぶんとして数えると大きく足りなくなる
const TAB_PX = 26;

// 幅375pxのときコードが使える幅。本文列351px（コードは画面端まで伸ばす #2563）から
// 左右のパディング 12px ずつを引いた値。ここを超えると横スクロールになる
const NARROW_PX = 327;
// 幅768px以上でコードが使える幅の最小値（実測）。768pxで656px、992pxで896px、
// **1025pxでサイドバーが出て656pxに戻り**、1200pxで791px と単調ではないので、
// 「PC では必ず収まる」と言えるのは最小値の側。16px の余裕を見て切る
const WIDE_PX = 640;

const FIGURE = /<figure class="highlight\b[\s\S]*?<\/figure>/g;
const PRE = /<pre>([\s\S]*?)<\/pre>/;

// 等幅フォントでは全角が半角2つ分の幅を占める。East Asian Width の
// Wide / Fullwidth の範囲を見る
const WIDE_CHAR = /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦]/;

function stripTags(html) {
  return (
    html
      .replace(/<[^>]*>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#123;/g, '{')
      .replace(/&#125;/g, '}')
      // &amp; を最後にほどく。先にほどくと &amp;lt; が < になってしまう
      .replace(/&amp;/g, '&')
  );
}

/** 最長行の描画幅（px）。 */
function maxLineWidth(preInner) {
  let max = 0;
  for (const line of preInner.split(/<br\s*\/?>/)) {
    let px = 0;
    for (const ch of stripTags(line)) {
      if (ch === '\t') px = (Math.floor(px / TAB_PX) + 1) * TAB_PX;
      else px += WIDE_CHAR.test(ch) ? CHAR_PX * 2 : CHAR_PX;
    }
    if (px > max) max = px;
  }
  return max;
}

/**
 * id は同じページで衝突しなければよい。記事ページに出るコードは1本の記事の
 * ものだけなので通し番号で足りるが、抜粋が並ぶページでも壊れないよう
 * 記事ごとの接頭辞を付ける。
 */
function shortId(source) {
  let h = 0;
  for (const ch of String(source)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h.toString(36);
}

function addToggles(content, prefix) {
  let n = 0;
  return content.replace(FIGURE, (figure) => {
    const pre = PRE.exec(figure);
    if (!pre) return figure;
    const width = maxLineWidth(pre[1]);
    if (width <= NARROW_PX) return figure;

    const id = `code-wrap-${prefix}-${++n}`;
    // PC では収まるブロックは、そちらでラベルを隠す（CSS 側のメディアクエリ）
    const cls = width <= WIDE_PX ? 'code-wrap-label code-wrap-narrow' : 'code-wrap-label';
    // input は table より前に置く。切り替えは `input:checked ~ table` で効かせる。
    // label は for で結ぶので、置く位置は CSS の都合で決めてよい
    const control =
      `<input type="checkbox" id="${id}" class="code-wrap-input">` +
      `<label class="${cls}" for="${id}">折り返す</label>`;
    return figure.replace(/^(<figure class="highlight\b[^>]*>)/, `$1${control}`);
  });
}

hexo.extend.filter.register('after_post_render', function (data) {
  if (!data || !data.content || data.content.indexOf('<figure class="highlight') === -1) {
    return;
  }
  data.content = addToggles(data.content, shortId(data.source));
  return data;
});

module.exports = { addToggles, maxLineWidth, NARROW_PX, WIDE_PX };
