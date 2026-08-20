/**
 * 隣接する2文が同じ接続語で始まっている箇所を検出する。
 *
 * preset の `no-doubled-conjunction` の置き換え（#2381）。あちらは**文の中で最初に
 * 現れた接続詞**を文どうしで比べるため、全記事99件のうち71件が誤検知だった。
 * オプションを1つも持たないので、閾値でも allowlist でも絞れない。
 *
 * - **一方または両方が文中の接続詞**（46件）。`省略された項の同定および復元`、
 *   `新しい又は改善した製品` のような列挙の語は文の始め方ではなく、繰り返すのが正しい。
 *   引用の中の発言（`「でも、俺はやれる範囲でやっていたもん！」`）もここに入る
 * - **両方が文頭だが間に文が挟まる**（25件）。`また、A。B。C。また、D。` のように
 *   離れていても報告する（接続詞を持たない文をまたいで直前の語を持ち越すため）
 *
 * 読者が「同じ言葉で続けて始まった」と感じるのは**隣の文**の**文頭**だけなので、
 * その条件だけを見る。文頭は行頭の記法（`**` や引用記号）を除いた最初の形態素で判定し、
 * `「` は落とさないため引用した発言は自動的に外れる。
 *
 * 対象ノードは preset と同じ Paragraph で、リンク・画像・引用・強調の中は見ない。
 */
const { tokenize } = require("kuromojin");
const { splitAST, SentenceSplitterSyntax } = require("sentence-splitter");

// リンク・画像・引用・強調の中は見ない（preset と同じ範囲）
const SKIP_ANCESTORS = ["Link", "Image", "BlockQuote", "Emphasis"];

// 文頭の判定に要るのは最初の形態素だけなので、先頭だけ解析する
const HEAD_LENGTH = 20;
// 行頭の記法。`「` は落とさない（引用した発言を文頭の接続語と混ぜないため）
const LEADING_MARKUP = /^[\s*_`>|]+/;

module.exports = function (context) {
  const { Syntax, RuleError, report } = context;

  const isSkipped = (node) => {
    for (let current = node.parent; current; current = current.parent) {
      if (SKIP_ANCESTORS.includes(current.type)) {
        return true;
      }
    }
    return false;
  };

  const opener = async (sentence) => {
    // 絵文字の途中で切ると kuromoji が例外で落ちるので、コードポイント単位で切る
    const head = Array.from(sentence.raw.replace(LEADING_MARKUP, ""))
      .slice(0, HEAD_LENGTH)
      .join("");
    if (head === "") {
      return null;
    }
    const [first] = await tokenize(head);
    return first && first.pos === "接続詞" ? first.surface_form : null;
  };

  return {
    async [Syntax.Paragraph](node) {
      if (isSkipped(node)) {
        return;
      }
      const sentences = splitAST(node).children.filter(
        (child) => child.type === SentenceSplitterSyntax.Sentence
      );
      if (sentences.length < 2) {
        return;
      }
      const openers = await Promise.all(sentences.map(opener));
      openers.forEach((current, index) => {
        if (index === 0 || current === null) {
          return;
        }
        if (current !== openers[index - 1]) {
          return;
        }
        report(
          sentences[index],
          new RuleError(
            `前の文と同じ接続語「${current}」で文が始まっています。片方を別の語にするか落としてください`,
            { index: 0 }
          )
        );
      });
    },
  };
};
