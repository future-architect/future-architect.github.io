/**
 * 生 HTML の開始タグで、属性同士が空白なしで繋がっている箇所（`width="460px"loading="lazy"`）を検出する。
 *
 * HTML5 パーサはエラー回復して読むが仕様上は parse error で、他のツールが拾えるとは限らない（#2527）。
 *
 * Syntax.Html ノードだけでは足りない。属性がくっついた開始タグは CommonMark の
 * 「open tag」の文法（属性は空白区切り）を満たさないため、remark が HTML ブロックとして
 * 認識できず Syntax.Str（地の文）に落ちる（img タグでの実例で確認済み）。さらに属性値の
 * 中の URL が自動リンク化され、タグが Str / Link / Str に分断されることもある。
 * そのため Document を丸ごと文字列として舐め、フェンスのコードブロック（Syntax.CodeBlock）と
 * インラインコード（Syntax.Code）の範囲だけ手動で除外する
 *
 * 属性は正規表現の貪欲マッチで一括に拾わず、開始タグの中身を先頭から順に切り出して、
 * 直前の属性の終端と次の属性の開始位置が一致する（＝間に何も無い）ときだけ報告する。
 * 「引用符 + 任意文字 + 引用符」で拾う書き方は、開始・終了の引用符が属性をまたいでずれて
 * 正常なタグ（`width="1200" height="447"`）まで誤検出したため採らない。
 */
// --fix を効かせるには linter とは別に fixer を持つ形（{ linter, fixer }）でエクスポートする必要がある
// （textlint v15 の TextlintFixableRuleDescriptor が module.fixer の有無で fix 対象かどうかを判定するため）。
// 同じ reporter を両方に渡せば、report() に fix を渡すだけで linter 側でも --fix 側でも動く
const TAG_RE = /<([a-zA-Z][a-zA-Z0-9-]*)(\s+[^<>]*)>/g;
const ATTR_RE = /[a-zA-Z_:][-a-zA-Z0-9_:.]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>]+))?/g;

// フェンスのコードブロック・インラインコードの range を集める。中に children は無いので再帰は不要
function collectCodeRanges(node, ranges) {
  if (node.type === "CodeBlock" || node.type === "Code") {
    ranges.push(node.range);
    return;
  }
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => collectCodeRanges(child, ranges));
  }
}

function isInsideCode(position, codeRanges) {
  return codeRanges.some(([start, end]) => position >= start && position < end);
}

const reporter = function (context) {
  const { Syntax, RuleError, report, getSource, fixer } = context;

  return {
    [Syntax.Document](node) {
      const source = getSource(node);
      const base = node.range[0];

      const codeRanges = [];
      collectCodeRanges(node, codeRanges);

      TAG_RE.lastIndex = 0;
      let tagMatch;
      while ((tagMatch = TAG_RE.exec(source)) !== null) {
        const attrs = tagMatch[2];
        const attrsStart = tagMatch.index + tagMatch[0].indexOf(attrs);

        ATTR_RE.lastIndex = 0;
        let prevEnd = null;
        let attrMatch;
        while ((attrMatch = ATTR_RE.exec(attrs)) !== null) {
          const start = attrsStart + attrMatch.index;
          const end = start + attrMatch[0].length;

          if (prevEnd !== null && prevEnd === start && !isInsideCode(base + start, codeRanges)) {
            report(
              node,
              new RuleError(
                "HTML の属性の間に空白がありません（属性が繋がっていると仕様上は parse error です）",
                {
                  index: start,
                  fix: fixer.insertTextBeforeRange([start, start], " "),
                }
              )
            );
          }
          prevEnd = end;
        }
      }
    },
  };
};

module.exports = {
  linter: reporter,
  fixer: reporter,
};
