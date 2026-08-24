'use strict';

/**
 * 横に溢れるコードブロックに「折り返す」トグルを足すフィルター (#2752)。
 *
 * チェックボックスと label だけで作り、JS は使わない。ランキングのタブと
 * 同じ手（`input:checked` と兄弟結合子）で、切り替えは CSS が受け持つ。
 * クリップボードを触るコピー機能と違い、折り返しは JS 無しで実装できる。
 *
 * **溢れるブロックにだけ出す。** 全記事のコードブロック 7,879 個のうち、
 * 対象は 4,931 個（63%）。残りはどの幅でも1行に収まるか、溢れても数文字ぶんで、
 * 押しても得が無いトグルになる。
 *
 * 判定は描画後の HTML から最長行を測って行う。フェンスの記法（``` と ~~~、
 * csv / diff_* の自前描画）に依らず、実際に出た行を見るため。
 *
 * **ここで測るのは見積もりでしかない。** 読者の画面幅・当たる等幅フォントの
 * 字送り・拡大率は分からないので、実際に溢れるかは描画時にしか決まらない。
 * 最終的な出し分けは CSS の scroll-state コンテナクエリがブラウザに聞く
 * （highlight.styl の末尾）。ここの閾値は、それに未対応のブラウザ向けの見積もり。
 *
 * ラベルは絵柄だけで、絵柄は CSS（highlight.styl）が持つ。アイコンの辞書は
 * `_partial/svg-icon.ejs` が1箇所で持つ決まり (#2774) だが、フィルターからは
 * partial を呼べない。JS の中に SVG を書くと絵柄が2箇所になるため、CSS 側に置く。
 */

// 等幅13pxの字送り。ui-monospace が当たる SF Mono / Cascadia Code /
// Menlo / Liberation Mono はいずれも 0.6em 前後。Consolas は 0.55em で
// もう少し入るが、狭い側に見積もっておけば足りない方には外れない
const CHAR_PX = 7.8;
// tab-size: 2em（theme-styles.styl）。タブは次の 26px の位置まで進む。
// Go のインデントはタブなので、1文字ぶんとして数えると大きく足りなくなる
const TAB_PX = 26;

// トグルを出す下限。幅414pxのときコードが使える幅（実測）で、コードは画面端まで
// 伸びる (#2563) ので 100vw から左右のパディング 12px ずつを引いた値。
//
// **幅375pxの 351px ではなく、一段広い実機の幅で切っている。** 351px にすると
// 「4文字だけ溢れる」ブロックにもトグルが出る（日本語のコメントは1文字が2桁ぶん
// 幅を取るので、見た目より早く溢れる）。数文字ぶんの横スクロールなら折り返す
// 意味が薄いので、狭い方の実機で少し溢れる程度は対象から外す。
// 全ブロックのうち対象は 69% から 63% になる
const NARROW_PX = 390;
// 幅768px以上でコードが使える幅の最小値（実測）。768pxで656px、992pxで896px、
// **1025pxでサイドバーが出て656pxに戻り**、1200pxで791px と単調ではないので、
// 「PC では必ず収まる」と言えるのは最小値の側。16px の余裕を見て切る
const WIDE_PX = 640;

// トグルの名前。読み上げ（aria-label）と吹き出し（title）で同じ文言を使う
const LABEL = 'コードの折り返しを切り替える';

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
    // PC では収まるブロックに印を付ける。scroll-state に未対応のブラウザ向けの
    // 見積もりで、CSS 側のメディアクエリが input と label の両方を隠す
    const cls = width <= WIDE_PX ? 'code-wrap-input code-wrap-narrow' : 'code-wrap-input';
    // input は table より前に置く。切り替えは `input:checked ~ table` で効かせる。
    // label は for で結ぶので、置く位置は CSS の都合で決めてよい。
    //
    // ラベルは絵柄だけなので、名前は input の aria-label が持つ（絵柄は CSS の
    // mask で描くため、読み上げに渡せる要素が中に無い）。title は目で見る
    // 読者向けの吹き出し
    const control =
      `<input type="checkbox" id="${id}" class="${cls}" aria-label="${LABEL}">` +
      `<label class="code-wrap-label" for="${id}" title="${LABEL}"></label>`;
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
