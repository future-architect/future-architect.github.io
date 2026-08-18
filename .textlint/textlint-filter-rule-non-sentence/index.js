/**
 * 文ではない段落では、指定したルールを無視する。次の3つを対象にする（#2381）。
 *
 * 1. コード・表・画像・引用・箇条書きの**直前**の段落 … そのブロックのラベル・導入。
 *    句点を求めても「▼ サンプルコード。」にしかならない。
 *    #2491 が助詞終わりの導入文に `…` を付けたのと同じ集合
 * 2. 箇条書きの**直後**の段落 … 直前の項目の続き（`* **動的リンク**` の下に
 *    説明を書く形が多い）。箇条書きの一部として読むので句点は要らない
 * 3. 箇条書きの**中**（ネストを含む）… 項目は文ではなく、句点を打たないのが
 *    このブログの書き方。項目に句点を足すと兄弟の項目と体裁が割れる
 *
 * 長さでは切っていない。何文字までがラベルかを決められないので位置で決める。
 *
 * .textlintrc での指定:
 *   "filters": {
 *     "non-sentence": {
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

  const ignore = (node) =>
    ruleIds.forEach((ruleId) => shouldIgnore(node.range, { ruleId }));

  return {
    [Syntax.Document](node) {
      const children = node.children || [];
      children.forEach((child, index) => {
        if (child.type === Syntax.List) {
          ignore(child);
          return;
        }
        if (child.type !== Syntax.Paragraph) {
          return;
        }
        if (isBlock(children[index + 1]) || children[index - 1]?.type === Syntax.List) {
          ignore(child);
        }
      });
    },
  };
};
