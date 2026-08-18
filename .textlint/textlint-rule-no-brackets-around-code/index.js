/**
 * インラインコード（`` `code` ``）だけを鍵括弧で囲んでいる箇所（`「`find`」`）を検出する。
 *
 * インラインコードは背景色と等幅フォントで既に「語ではなくコード」だと分かるため、
 * 鍵括弧は二重の囲みで冗長（#2528）。既存の43箇所は除去済みで、これは再発防止用。
 *
 * 直前1文字が「、直後1文字が」のときだけ報告する。`「`01`（下書き）」` や
 * `「1 つの `parent` に…」` のように括弧の中にコード以外の文字がある形は、
 * 引用や区切りとして働いているため対象にしない（101箇所60ファイルで確認済み）。
 */
// --fix を効かせるには linter とは別に fixer を持つ形（{ linter, fixer }）でエクスポートする必要がある
// （textlint v15 の TextlintFixableRuleDescriptor が module.fixer の有無で fix 対象かどうかを判定するため）。
// 同じ reporter を両方に渡せば、report() に fix を渡すだけで linter 側でも --fix 側でも動く
const reporter = function (context) {
  const { Syntax, RuleError, report, getSource, fixer } = context;
  const source = getSource();

  return {
    [Syntax.Code](node) {
      const [start, end] = node.range;
      if (source[start - 1] !== "「" || source[end] !== "」") {
        return;
      }
      // fixer.replaceTextRange の range はノード相対（絶対指定は replaceText(node, text) 側）
      const nodeText = source.slice(start, end);
      report(
        node,
        new RuleError(
          "インラインコードを鍵括弧で囲む必要はありません（背景色と等幅フォントで既にコードだと分かります）",
          {
            fix: fixer.replaceTextRange([-1, nodeText.length + 1], nodeText),
          }
        )
      );
    },
  };
};

module.exports = {
  linter: reporter,
  fixer: reporter,
};
