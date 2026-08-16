'use strict';

/**
 * ```diff_go のように書くと、diff 表示に加えて言語の構文ハイライトも効かせる。
 *
 * 素の ```diff は差分の色しか付かず、コードとしては読みにくい。
 * かといって ```go では差分が分からない。両方を出したい。
 *
 * 見せ方は差分を優先する。
 *
 * - 追加行（+）・削除行（-）は行全体を差分の色にする。ただし色だけを
 *   上書きし font-weight は触らないので、キーワードの太字は残る
 * - 言語側の「強調を足す」色は落とす。差分の赤緑と構文の色が同時に出ると
 *   色数が多すぎて、どこが変わったのかが読み取りにくくなる
 * - ただし「優先度を下げる」色は残す。コメントを地の文より暗くするのは
 *   情報量を減らす方向なので、差分の読み取りを邪魔しない
 * - キーワードの太字も残す。色を持たせなくても構造は伝わる
 *
 * hexo 標準のハイライタを通さず、terraform 用（register_hljs_terraform.js）と
 * 同じやり方でコードブロックを横取りして自前で組み立てる。
 */

const hljs = require('highlight.js');
const { replaceOutsideFences } = require('./lib/fence');

// ```diff_go / ```diff-go のどちらでも受ける。後ろにファイル名を書ける点は
// hexo 標準のコードブロックと同じ
const FENCE = /^([ \t]*)```diff[_-]([A-Za-z0-9#+.-]+)[ \t]*(.*)\n([\s\S]*?)\n[ \t]*```/gm;

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * コードを一括でハイライトしたうえで行に分割する。
 *
 * 行ごとに hljs を呼ぶとブロックコメントや raw string のように
 * 複数行にまたがる構文が壊れる。まとめてハイライトしてから、
 * 行境界で開いたままの span を閉じ直し、次の行の先頭で開き直す。
 */
function highlightLines(code, language) {
  const html = hljs.highlight(code, { language, ignoreIllegals: true }).value;
  const lines = [];
  let open = [];

  for (const line of html.split('\n')) {
    const carried = open.slice();
    const re = /<span class="([^"]*)">|<\/span>/g;
    let m;
    while ((m = re.exec(line))) {
      if (m[1]) carried.push(m[1]);
      else carried.pop();
    }
    lines.push(
      open.map((c) => `<span class="${c}">`).join('') + line + '</span>'.repeat(carried.length),
    );
    open = carried;
  }
  return lines;
}

/**
 * 言語側の色を落とす。
 *
 * 差分の赤緑と構文の色が同時に出ると色数が多すぎて読み取りにくいため、
 * 強調を足すだけのクラス（キーワード・型・文字列・数値など）は
 * クラスを外して地の文の色に戻す。
 *
 * 例外は2つ。
 * - comment は地の文より暗くする「優先度を下げる」色なので残す
 * - keyword は色を外したうえで太字だけ残したいので、専用クラスに移す
 *
 * span の数は変えないので、行またぎの開き直しとも整合する。
 */
function neutralize(html) {
  return html.replace(/<span class="([^"]*)">/g, (tag, cls) => {
    if (cls === 'comment') return tag;
    if (cls === 'keyword') return '<span class="keyword-plain">';
    return '<span>';
  });
}

function render(code, language) {
  // 差分マーカーを外した素のコードにしてからハイライトする。
  // マーカーが残っていると言語として解釈できず、全体が崩れる
  const rows = code.split('\n').map((line) => {
    const head = line.charAt(0);
    if (head === '+' || head === '-') {
      return { marker: head, body: line.slice(1), cls: head === '+' ? 'addition' : 'deletion' };
    }
    return { marker: '', body: line, cls: '' };
  });

  const highlighted = highlightLines(rows.map((r) => r.body).join('\n'), language);

  return rows
    .map((r, i) => {
      // テーマの CSS は hljs- 接頭辞の付かないクラス名を前提にしている
      const body = neutralize(highlighted[i].replace(/hljs-/g, ''));
      const cls = r.cls ? `line ${r.cls}` : 'line';
      return `<span class="${cls}">${escapeHtml(r.marker)}${body}</span><br>`;
    })
    .join('');
}

hexo.extend.filter.register(
  'before_post_render',
  function (data) {
    if (data.layout !== 'post' && data.layout !== 'page') return;
    if (data.content.indexOf('```diff') === -1) return;

    // 外側のフェンスに入れ子で書かれた ```diff_xxx は記法の見本なので触らない (#2549)
    data.content = replaceOutsideFences(
      data.content,
      FENCE,
      (match, indent, lang, caption, code) => {
        // hljs が知らない言語はそのまま素の diff として hexo に任せる
        if (!hljs.getLanguage(lang)) return match;

        const caption_ = caption.trim();
        return (
          indent +
          `<figure class="highlight diff_${escapeHtml(lang)}">` +
          (caption_ ? `<figcaption><span>${escapeHtml(caption_)}</span></figcaption>` : '') +
          `<table><tbody><tr><td class="code"><pre>${render(code, lang)}</pre></td></tr></tbody></table>` +
          `</figure>`
        );
      },
    );
  },
  9,
);
