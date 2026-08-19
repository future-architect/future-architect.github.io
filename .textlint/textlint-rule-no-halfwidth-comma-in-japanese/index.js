/**
 * 日本語に挟まれた半角カンマ（`背景,共分散` のような読点の代わりの `,`）を検出する。
 *
 * `max-comma`（一文の半角カンマ3個超）の置き換え（#2381）。あちらは個数を見るため、
 * 英語トークンの羅列・英文引用・数式・参考文献を大量に拾って139件中129件が誤検知だった。
 * 直したいのは「日本語の文で読点の代わりに半角カンマを使っている」ことなので、
 * 個数ではなく**カンマの左右が日本語か**を見る。`千葉さん,織田さん` のようにカンマが
 * 3個以下の誤用も拾えるようになる（max-comma では閾値に届かず見逃していた）。
 *
 * 空白を挟む形（`佐藤元紀, 能地宏`）は対象にしない。書誌や英語混じりの列挙が大半で、
 * 誤りとは言えないため。**空白なしで日本語に挟まれた**ときだけ報告する。
 *
 * 表のセル（タグの列挙 `|AWS,infrastructure,CMS,クラウドサービス|`）と引用（原文ママ）は
 * 対象外。コード・インラインコードは Str ノードに現れないので自動的に外れる。
 */
const JP = "\\u3041-\\u3096\\u30A1-\\u30FA\\u30FC\\u4E00-\\u9FFF";
// 後ろを先読みにしないと `灰,茶,緑` の2つ目以降を食い残す
const PATTERN = new RegExp(`[${JP}],(?=[${JP}])`, "g");
const SKIP_ANCESTORS = ["TableCell", "TableRow", "Table", "BlockQuote"];

module.exports = function (context) {
  const { Syntax, RuleError, report, getSource } = context;

  const isSkipped = (node) => {
    for (let current = node.parent; current; current = current.parent) {
      if (SKIP_ANCESTORS.includes(current.type)) {
        return true;
      }
    }
    return false;
  };

  return {
    [Syntax.Str](node) {
      if (isSkipped(node)) {
        return;
      }
      const text = getSource(node);
      for (const match of text.matchAll(PATTERN)) {
        // マッチは「日本語 ,」の2文字。カンマは2文字目
        const index = match.index + 1;
        const excerpt = text.slice(Math.max(0, index - 6), index + 7);
        report(
          node,
          new RuleError(
            `日本語の中で半角カンマを使っています（${excerpt}）。読点「、」か中黒「・」にしてください`,
            { index }
          )
        );
      }
    },
  };
};
