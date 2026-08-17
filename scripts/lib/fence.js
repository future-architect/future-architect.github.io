'use strict';

/**
 * コードフェンスの範囲を求める（#2549）。
 *
 * 独自記法のフィルタは before_post_render で生の Markdown に正規表現を当てるため、
 * その時点ではコードフェンスという概念が無く、フェンスの中に書いた見本まで
 * 置換してしまう。記法を説明する記事（#2533 の記法まとめページ）が書けない。
 *
 * 判定は「マッチの開始位置がフェンスの内側か」だけを見る。フェンスの開始位置
 * そのものは内側に含めない。こうすると、フェンス自体が対象の記法（csv /
 * diff_[language] / mermaid）は自分のフェンスでは素通しされず、外側のフェンスに
 * 入れ子で書かれたときだけ素通しされる。note のようにフェンスでない記法は、
 * フェンスの中にある限り必ず内側と判定される。同じ関数で両方を賄える。
 *
 * 見るのはフェンス（``` / ~~~）だけで、4字下げのコードブロックは見ない。
 * 独自記法の正規表現は行頭の空白を許すので下げても逃げられず、下げる書き方で
 * 見本を作ることが元からできないため。
 */

// 開始は3つ以上の ` か ~。閉じは同じ記号を同じ数以上並べた、他に何も無い行
const FENCE_LINE = /^[ \t]*(`{3,}|~{3,})(.*)$/;

/** フェンスの範囲を [開始位置, 終了位置) の配列で返す */
function fenceRanges(content) {
  const ranges = [];
  let open = null;
  let start = 0;
  let pos = 0;

  for (const line of content.split('\n')) {
    const m = FENCE_LINE.exec(line);
    if (m) {
      if (!open) {
        open = m[1];
        start = pos;
      } else if (m[1][0] === open[0] && m[1].length >= open.length && m[2].trim() === '') {
        ranges.push([start, pos + line.length]);
        open = null;
      }
    }
    pos += line.length + 1;
  }
  // 閉じ忘れは本文の終わりまでをフェンスとみなす。Markdown 側も同じ扱いで、
  // 閉じられていないフェンスは末尾までコードとして描画される
  if (open) ranges.push([start, content.length]);
  return ranges;
}

/**
 * フェンスの中を避けて置換する。replacer は String#replace と同じ引数を受け取る。
 */
function replaceOutsideFences(content, regex, replacer) {
  const ranges = fenceRanges(content);
  if (!ranges.length) return content.replace(regex, replacer);

  return content.replace(regex, function (...args) {
    // 名前付きグループを使う正規表現ではコールバックの末尾に groups が付くため、
    // 位置は「最初に現れる数値の引数」として取る
    const offset = args.find((a) => typeof a === 'number');
    if (ranges.some(([s, e]) => offset > s && offset < e)) return args[0];
    return replacer.apply(null, args);
  });
}

module.exports = { fenceRanges, replaceOutsideFences };
