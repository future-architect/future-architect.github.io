/**
 * 指定した年より前の記事では、指定したルールを無視する。
 *
 * `no-doubled-joshi` は全記事で4,378件出るが、直すには一件ずつ語順を変える判断が要り、
 * 過去記事を機械的に書き換える意味が薄い。新しい記事だけ守れば十分という方針（#2381）。
 *
 * .textlintrc での指定:
 *   "filters": {
 *     "legacy-articles": {
 *       "from": 2026,
 *       "rules": ["ja-technical-writing/no-doubled-joshi"]
 *     }
 *   }
 *
 * filter は関数を直接エクスポートする（config-loader の判定は typeof === "function"。
 * エラーメッセージは filter プロパティを求めるように読めるが実装と食い違っている）。
 */
const YEAR_IN_PATH = /[\\/]_posts[\\/](\d{4})[\\/]/;

module.exports = function (context, options = {}) {
  const { Syntax, shouldIgnore, getFilePath } = context;
  const from = options.from;
  const rules = options.rules || [];
  if (!from || rules.length === 0) {
    return {};
  }
  const matched = YEAR_IN_PATH.exec(getFilePath() || "");
  // 年が読めないパス（テスト・標準入力など）は対象外にしない
  if (!matched || Number(matched[1]) >= from) {
    return {};
  }
  return {
    [Syntax.Document](node) {
      rules.forEach((ruleId) => shouldIgnore(node.range, { ruleId }));
    },
  };
};
