/**
 * コード・表・画像・引用・箇条書きの直前にある段落では、指定したルールを無視する。
 *
 * この位置の段落はブロックのラベル・導入であって文ではないため、句点を求めても
 * 「▼ サンプルコード。」のような不自然な形にしかならない（#2381）。
 * #2491 が助詞終わりの導入文に `…` を付けたのと同じ集合を対象にしている。
 *
 * .textlintrc での指定:
 *   "filters": {
 *     "block-label": {
 *       "rules": ["ja-technical-writing/ja-no-mixed-period"]
 *     }
 *   }
 *
 * filter は関数を直接エクスポートする（config-loader の判定は typeof === "function"）。
 */
module.exports = function (context, options = {}) {
  const { Syntax, shouldIgnore } = context;
  const ruleIds = options.rules || [];
  if (ruleIds.length === 0) {
    return {};
  }

  const BLOCKS = [
    Syntax.CodeBlock,
    Syntax.List,
    Syntax.Table,
    Syntax.BlockQuote,
    Syntax.Html,
  ].filter(Boolean);

  // 画像だけの段落（`![](...)` 単独行）もブロックとして扱う
  const isImageOnlyParagraph = (node) =>
    node.type === Syntax.Paragraph &&
    (node.children || []).length > 0 &&
    (node.children || []).every(
      (child) =>
        child.type === Syntax.Image ||
        child.type === Syntax.Html ||
        (child.type === Syntax.Str && child.value.trim() === "")
    );

  const isBlock = (node) =>
    !!node && (BLOCKS.includes(node.type) || isImageOnlyParagraph(node));

  return {
    [Syntax.Document](node) {
      const children = node.children || [];
      children.forEach((child, index) => {
        if (child.type !== Syntax.Paragraph) {
          return;
        }
        if (!isBlock(children[index + 1])) {
          return;
        }
        ruleIds.forEach((ruleId) => shouldIgnore(child.range, { ruleId }));
      });
    },
  };
};
