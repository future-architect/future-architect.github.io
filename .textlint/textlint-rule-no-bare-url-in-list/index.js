/**
 * 箇条書きの項目が裸URLだけになっているものを検出する（#2910）。
 *
 * 裸URLは hexo が自動リンクにするので、リンクテキストがURLそのままになる。
 * 参考リストは読者が行き先を見比べて選ぶ場所なので、そこに名前が無いと選べない。
 *
 * --fix は持たない。リンクテキストは機械には決められないため。
 * 全408件の <title> を実際に取ってみたところ、取れたのは 86% で、そのうち 57% は
 * サイト名の接尾辞付き（`… · GitHub` / `… - Qiita`）。親項目や直前の地の文が
 * 既に行き先を名乗っている形もあり、そこへ流し込むと名乗りが二重になる。
 */
module.exports = function (context) {
  const { Syntax, RuleError, report } = context;

  return {
    [Syntax.ListItem](node) {
      const paragraph = node.children.find((c) => c.type === Syntax.Paragraph);
      if (!paragraph || paragraph.children.length !== 1) {
        return;
      }
      const link = paragraph.children[0];
      if (link.type !== Syntax.Link) {
        return;
      }
      // 自動リンク（裸URL）はリンクテキストがURLそのもの。[名前](URL) はここで外れる
      const text = link.children.map((c) => c.value || "").join("");
      if (text !== link.url) {
        return;
      }
      report(
        paragraph,
        new RuleError(
          `箇条書きの項目が裸URLだけです（リンクテキストに行き先の名前を書いてください: \`- [ページ名](${link.url})\`）`,
          { index: 0 }
        )
      );
    },
  };
};
