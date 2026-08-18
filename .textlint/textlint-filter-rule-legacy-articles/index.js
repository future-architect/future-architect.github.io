/**
 * 指定した年より前の記事では、指定したルールを無視する。
 *
 * `no-doubled-joshi` は全記事で4,378件出るが、直すには一件ずつ語順を変える判断が要り、
 * 過去記事を機械的に書き換える意味が薄い。新しい記事だけ守れば十分という方針（#2381）。
 *
 * .textlintrc での指定。ルールごとに年を変えたいときはオブジェクトで `from` を持たせる
 * （無ければ全体の `from`）:
 *   "filters": {
 *     "legacy-articles": {
 *       "from": 2026,
 *       "rules": [
 *         "ja-technical-writing/no-doubled-joshi",
 *         { "rule": "no-img-without-dimensions", "from": 2022, "cleaned": [2016] }
 *       ]
 *     }
 *   }
 *
 * `cleaned` は `from` より前でも直し終わって対象に戻した年（#2605）。過去記事を
 * 年単位で潰していく間、直した年だけ先に守るために要る。`from` を下げる形では
 * 「2016年だけ直した」を表せない。全年そろったら `from` を下げて `cleaned` は消す。
 *
 * filter は関数を直接エクスポートする（config-loader の判定は typeof === "function"。
 * エラーメッセージは filter プロパティを求めるように読めるが実装と食い違っている）。
 */
const YEAR_IN_PATH = /[\\/]_posts[\\/](\d{4})[\\/]/;

module.exports = function (context, options = {}) {
  const { Syntax, shouldIgnore, getFilePath } = context;
  const entries = (options.rules || [])
    .map((entry) =>
      typeof entry === "string"
        ? { ruleId: entry, from: options.from, cleaned: [] }
        : { ruleId: entry.rule, from: entry.from || options.from, cleaned: entry.cleaned || [] }
    )
    .filter((entry) => entry.ruleId && entry.from);
  if (entries.length === 0) {
    return {};
  }
  const matched = YEAR_IN_PATH.exec(getFilePath() || "");
  // 年が読めないパス（テスト・標準入力など）は対象外にしない
  if (!matched) {
    return {};
  }
  const year = Number(matched[1]);
  const ignored = entries.filter((entry) => year < entry.from && !entry.cleaned.includes(year));
  if (ignored.length === 0) {
    return {};
  }
  return {
    [Syntax.Document](node) {
      ignored.forEach(({ ruleId }) => shouldIgnore(node.range, { ruleId }));
    },
  };
};
