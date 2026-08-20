/**
 * `.ejs` を textlint に読ませるためのプラグイン (#2652)。
 *
 * 目的は外部リンクの明示チェック（#2346）を textlint に寄せること。EJS は
 * Markdown パーサに掛からないので、これまで /doctor/ の helper が独自に
 * 走査していた。プラグインにすればルール1本で PR の変更行に指摘が付く。
 *
 * **リンク以外は AST に出さない。** `<a href>` を Link ノードにするだけで、
 * 地の文・EJS コメント・属性値は木に入れない。EJS の中の日本語は UI ラベルや
 * 実装コメントで、記事の文章に向けたルール（文長・助詞の連続・句点）を
 * 当てても意味が無い。ノードを見るルールはこれで自動的に降りる。
 *
 * ただし **Document の原文は加工せずに渡す**（理由は preProcess のコメント）。
 * 原文を直接舐めるルールには届いてしまうので、そちら側で拡張子を見てもらう。
 */
const LINK_RE = /<a\b[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a/g;

// EJS 式・コメントは落とす。href が式の場合に属性の切り出しが壊れるため。
// 位置をずらさないよう、改行だけ残して同じ長さの空白に置き換える
function blankEjsTags(text) {
  return text.replace(/<%[\s\S]*?%>/g, (m) => m.replace(/[^\n]/g, " "));
}

function locOf(text, index) {
  const before = text.slice(0, index);
  const lines = before.split("\n");
  return { line: lines.length, column: lines[lines.length - 1].length };
}

function strip(inner) {
  return inner
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parse(text) {
  const flat = blankEjsTags(text);
  const children = [];

  LINK_RE.lastIndex = 0;
  let m;
  while ((m = LINK_RE.exec(flat)) !== null) {
    const innerStart = m.index + m[0].length - m[2].length - "</a".length;
    const innerEnd = innerStart + m[2].length;
    const value = strip(m[2]);
    // テキストの無いリンク（アイコンだけ）は Str を持たせない。名乗るのは aria-label 側
    const str = value
      ? [
          {
            type: "Str",
            value,
            raw: text.slice(innerStart, innerEnd),
            range: [innerStart, innerEnd],
            loc: { start: locOf(text, innerStart), end: locOf(text, innerEnd) },
          },
        ]
      : [];
    children.push({
      type: "Link",
      url: m[1],
      title: null,
      children: str,
      raw: text.slice(m.index, innerEnd),
      range: [m.index, innerEnd],
      loc: { start: locOf(text, m.index), end: locOf(text, innerEnd) },
    });
  }

  return {
    type: "Document",
    raw: text,
    range: [0, text.length],
    loc: { start: { line: 1, column: 0 }, end: locOf(text, text.length) },
    children,
  };
}

class EjsProcessor {
  static availableExtensions() {
    return [".ejs"];
  }

  availableExtensions() {
    return [".ejs"];
  }

  processor() {
    return {
      preProcess(text) {
        // **原文をそのまま textlint に渡す。** 加工した文字列を { text, ast } で
        // 返すと、--fix が「直した結果」としてその加工後の文字列をファイルに
        // 書き戻し、EJS が空白の塊になる（実際に壊した）。Document の原文を
        // 直接舐めるルールには、ルール側で拡張子を見て降りてもらう
        return parse(text);
      },
      postProcess(messages, filePath) {
        return { messages, filePath: filePath || "<ejs>" };
      },
    };
  }
}

module.exports = { Processor: EjsProcessor };
