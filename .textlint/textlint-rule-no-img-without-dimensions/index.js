/**
 * 生 HTML の `<img>` タグに整数の width / height が無い箇所を検出する。
 *
 * 寸法の無い画像は読み込み時にレイアウトシフト（CLS）を起こす。記事の画像は
 * 実寸の width / height を明記する決まり（CLAUDE.md）だが、書き忘れのほか
 * `wigth` / `widgh` / `weihgt` のようなタイポ、`width="75%"` / `width="460px"` の
 * ような HTML の属性として無効な値（整数のみが有効）が実記事に埋まっていた。
 * いずれも「width（height）が無い / 整数でない」として同じ網で拾える。
 *
 * remark は正しい形の img タグを Html ノードにするが、属性がタイポで崩れた
 * タグは Str に落ちることがある（no-glued-html-attributes と同じ事情）。
 * そのため同じ構えで Document の原文を舐め、コードブロックとインラインコードの
 * 範囲だけ除外する。記事中の攻撃例（`<img src=x onerror=...>`）や説明用の
 * `<img>` はコードの中に書かれているので、この除外で誤検出しない。
 *
 * 正しい寸法は画像を測らないと分からないので --fix は持たない。
 * 2021年以前の記事は legacy-articles フィルタで対象外（2,300箇所超あり、
 * 遡って直すかは別途判断）。
 */
// タグの終わりを素朴に [^<>]* で探すと、引用符の中の > （alt="inputs -> outputs" 等、
// 実記事に3件ある）でタグを途中で切ってしまい、後ろの width / height が見えず誤検出する。
// 引用符で囲まれた値は丸ごと飛ばして > を探す
const IMG_RE = /<img\b((?:"[^"]*"|'[^']*'|[^<>"'])*)>/gi;
const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>]+))?/g;

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

module.exports = function (context) {
  const { Syntax, RuleError, report, getSource } = context;

  return {
    [Syntax.Document](node) {
      const source = getSource(node);
      const base = node.range[0];

      const codeRanges = [];
      collectCodeRanges(node, codeRanges);

      IMG_RE.lastIndex = 0;
      let tagMatch;
      while ((tagMatch = IMG_RE.exec(source)) !== null) {
        if (isInsideCode(base + tagMatch.index, codeRanges)) {
          continue;
        }

        const attrs = new Map();
        ATTR_RE.lastIndex = 0;
        let attrMatch;
        while ((attrMatch = ATTR_RE.exec(tagMatch[1])) !== null) {
          const name = attrMatch[1].toLowerCase();
          const value = attrMatch[2] ? attrMatch[2].replace(/^["']|["']$/g, "") : "";
          // 同名の属性が重複しているときは HTML と同じく先勝ち
          if (!attrs.has(name)) {
            attrs.set(name, value);
          }
        }

        const problems = [];
        for (const name of ["width", "height"]) {
          if (!attrs.has(name)) {
            problems.push(`${name} 属性がありません`);
          } else if (!/^\d+$/.test(attrs.get(name))) {
            problems.push(`${name} 属性の値「${attrs.get(name)}」が整数ではありません`);
          }
        }
        if (problems.length > 0) {
          report(
            node,
            new RuleError(
              `img タグに ${problems.join("、")}（レイアウトシフトを防ぐため実寸を明記します）`,
              { index: tagMatch.index }
            )
          );
        }
      }
    },
  };
};
