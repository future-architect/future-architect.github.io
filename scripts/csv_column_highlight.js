'use strict';

/**
 * ```csv のコードブロックを列ごとに色分けする（#2529）。
 *
 * highlight.js に csv の定義は無く、フェンスに csv と書いても素のテキストで
 * 出ていた。列に色を付けるには「いま何列目か」を数える必要があるが、
 * highlight.js の言語定義は正規表現のモードだけで状態を持てない。
 * そのため rego のように言語を足す形は採れず、terraform や diff_[language] と
 * 同じくコードブロックごと横取りして自前で組み立てる。
 *
 * 区切りは RFC 4180 に沿って読む。実データに引用符付きが4件あり、うち1件は
 * 引用符の中に改行を含む（Go の encoding/csv の記事）。素の split(',') だと
 * その行から先が丸ごと崩れる。
 *
 * 色は highlight.styl の既存トークン色を6色循環させる（配色は CSS 側）。
 */

const { replaceOutsideFences } = require('./lib/fence');

const FENCE = /^([ \t]*)```csv[ \t]*(.*)\n([\s\S]*?)\n[ \t]*```/gm;

// 色数。8列でも2周目が隣の列と重ならない
const COLORS = 6;

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * 物理行ごとのトークン列に分解する。返す配列の1要素が出力の1行になる。
 *
 * 引用符の中の改行でも行は分ける。行は表示の単位（span.line と行番号）であって
 * レコードの単位ではないので、ここで畳むと元のテキストと見た目がずれる。
 * 列番号は引用符の外のカンマでだけ進み、レコードの終わりでだけ戻る。
 */
function tokenize(code) {
  const lines = [[]];
  let col = 0;
  let quoted = false;

  const push = (cls, text) => {
    const line = lines[lines.length - 1];
    const last = line[line.length - 1];
    if (last && last.cls === cls) last.text += text;
    else line.push({ cls, text });
  };
  const colClass = () => `csv-col-${(col % COLORS) + 1}`;

  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (ch === '\r') continue;
    if (ch === '"') {
      // 引用符の中の "" は文字としての " なので、閉じ引用符と見ない
      if (quoted && code[i + 1] === '"') {
        push(colClass(), '""');
        i++;
        continue;
      }
      quoted = !quoted;
      push(colClass(), ch);
      continue;
    }
    if (ch === '\n') {
      lines.push([]);
      if (!quoted) col = 0;
      continue;
    }
    if (ch === ',' && !quoted) {
      push('csv-comma', ch);
      col++;
      continue;
    }
    push(colClass(), ch);
  }
  return lines;
}

function render(lines) {
  return lines
    .map(
      (cells) =>
        '<span class="line">' +
        cells.map((c) => `<span class="${c.cls}">${escapeHtml(c.text)}</span>`).join('') +
        '</span><br>',
    )
    .join('');
}

hexo.extend.filter.register(
  'before_post_render',
  function (data) {
    // レイアウト名で絞らない。before_post_render は記事と固定ページにしか
    // 掛からないので絞る必要が無く、page 以外のレイアウト名を付けた固定ページ
    // （記法ガイドの page_nosidebar）で黙って効かなくなる (#2533)
    if (!data.content || data.content.indexOf('```csv') === -1) return;

    // 外側のフェンスに入れ子で書かれた ```csv は記法の見本なので触らない (#2549)
    data.content = replaceOutsideFences(data.content, FENCE, (match, indent, caption, code) => {
      const lines = tokenize(code);
      // 1列しかないブロックは色分けの対象にならない。全体が1色で塗られると
      // 意味のある色に見えてしまうので、hexo の素の描画に任せる
      const columns = Math.max(
        ...lines.map((cells) => cells.filter((c) => c.cls === 'csv-comma').length),
      );
      if (columns < 1) return match;

      const caption_ = caption.trim();
      return (
        indent +
        '<figure class="highlight csv">' +
        (caption_ ? `<figcaption><span>${escapeHtml(caption_)}</span></figcaption>` : '') +
        `<table><tbody><tr><td class="code"><pre>${render(lines)}</pre></td></tr></tbody></table>` +
        '</figure>'
      );
    });
  },
  9,
);
