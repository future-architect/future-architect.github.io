/**
 * サイトの導線で「（外部サイト）」の明示が無い外部リンクを検出する（#2346 / #2652）。
 *
 * 対象はテーマの EJS だけ。**記事本文と、`layout: page` の Markdown で書いた
 * 特設ページは対象外**（読み物の中の参照リンクにマークを挟むと読みにくい。
 * 技術記事の参照は94%が外部でマークが情報にならないのと同じ理由）。
 * EJS は Markdown パーサに掛からないので、textlint-plugin-ejs が
 * `<a href>` だけを Link ノードにして渡す。
 *
 * 以前は /doctor/ の helper（doctor_external_links）が同じ判定をしていたが、
 * 気づくには hexo generate して運営ページを開く必要があり PR では誰も見なかった。
 *
 * --fix は持たない。付ける位置が導線ごとに違う（フッターはアイコンが絵で名乗るので
 * `<span class="sr-only">`、ポータルはリンクテキストの末尾）ので機械には決められない。
 */
const EXEMPT_TEXT = require("./exempt");

const NOTICE = "（外部サイト）";

// 自ブログ内。同じホストでも /arch-guidelines/ のような別リポジトリのサイトは
// 外部扱いにする（guidelines.ejs が「（外部サイト）」を付けているのと同じ判断）
const INTERNAL_RE =
  /^https?:\/\/future-architect\.github\.io\/(?:articles|tags|categories|authors|series|specials|archives|page|doctor)\//i;

const reporter = function (context, options = {}) {
  const { Syntax, RuleError, report, getFilePath } = context;
  const include = options.include || ["themes/future/layout/"];
  const exemptFiles = options.exemptFiles || [];

  const filePath = (getFilePath() || "").replace(/\\/g, "/");
  // パスが取れないとき（文字列の lint）は判定できないので何も言わない
  if (!filePath || !include.some((dir) => filePath.includes(dir))) {
    return {};
  }
  if (exemptFiles.some((f) => filePath.endsWith(f))) {
    return {};
  }

  return {
    [Syntax.Link](node) {
      const url = node.url || "";
      if (!/^https?:\/\//i.test(url)) return;
      if (INTERNAL_RE.test(url)) return;

      const text = node.children.map((c) => c.value || "").join("").trim();
      // テキストの無いリンク（アイコンだけ）は aria-label が名乗る。
      // URL をそのまま書いたリンクはドメインが名乗る
      if (!text || /^https?:\/\//i.test(text)) return;
      if (EXEMPT_TEXT.some((word) => text.includes(word))) return;

      report(
        node,
        new RuleError(
          `外部リンク「${text}」に${NOTICE}がありません（リンクテキストから外部と読めないリンクには付ける。ブランド名・メディア名を名乗るリンクは対象外 #2346）`
        )
      );
    },
  };
};

module.exports = reporter;
