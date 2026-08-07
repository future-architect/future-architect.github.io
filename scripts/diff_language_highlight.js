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
 * - それ以外の行は指定された言語の構文ハイライトがそのまま出る
 *
 * hexo 標準のハイライタを通さず、terraform 用（register_hljs_terraform.js）と
 * 同じやり方でコードブロックを横取りして自前で組み立てる。
 */

const hljs = require('highlight.js');

// ```diff_go / ```diff-go のどちらでも受ける。後ろにファイル名を書ける点は
// hexo 標準のコードブロックと同じ
const FENCE = /^([ \t]*)```diff[_-]([A-Za-z0-9#+.-]+)[ \t]*(.*)\n([\s\S]*?)\n[ \t]*```/gm;

const escapeHtml = s => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/**
 * コードを一括でハイライトしたうえで行に分割する。
 *
 * 行ごとに hljs を呼ぶとブロックコメントや raw string のように
 * 複数行にまたがる構文が壊れる。まとめてハイライトしてから、
 * 行境界で開いたままの span を閉じ直し、次の行の先頭で開き直す。
 */
function highlightLines(code, language) {
  const html = hljs.highlight(code, {language, ignoreIllegals: true}).value;
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
      open.map(c => `<span class="${c}">`).join('')
      + line
      + '</span>'.repeat(carried.length)
    );
    open = carried;
  }
  return lines;
}

function render(code, language) {
  // 差分マーカーを外した素のコードにしてからハイライトする。
  // マーカーが残っていると言語として解釈できず、全体が崩れる
  const rows = code.split('\n').map(line => {
    const head = line.charAt(0);
    if (head === '+' || head === '-') {
      return {marker: head, body: line.slice(1), cls: head === '+' ? 'addition' : 'deletion'};
    }
    return {marker: '', body: line, cls: ''};
  });

  const highlighted = highlightLines(rows.map(r => r.body).join('\n'), language);

  return rows.map((r, i) => {
    // テーマの CSS は hljs- 接頭辞の付かないクラス名を前提にしている
    const body = highlighted[i].replace(/hljs-/g, '');
    const cls = r.cls ? `line ${r.cls}` : 'line';
    return `<span class="${cls}">${escapeHtml(r.marker)}${body}</span><br>`;
  }).join('');
}

hexo.extend.filter.register('before_post_render', function(data) {
  if (data.layout !== 'post' && data.layout !== 'page') return;
  if (data.content.indexOf('```diff') === -1) return;

  data.content = data.content.replace(FENCE, (match, indent, lang, caption, code) => {
    // hljs が知らない言語はそのまま素の diff として hexo に任せる
    if (!hljs.getLanguage(lang)) return match;

    const caption_ = caption.trim();
    return indent
      + `<figure class="highlight diff_${escapeHtml(lang)}">`
      + (caption_ ? `<figcaption><span>${escapeHtml(caption_)}</span></figcaption>` : '')
      + `<table><tbody><tr><td class="code"><pre>${render(code, lang)}</pre></td></tr></tbody></table>`
      + `</figure>`;
  });
}, 9);
