/**
 * サイトの導線で「（外部サイト）」の明示が無い外部リンクを検出する (#2346 / #2652)。
 *
 * 同じ判定は EJS 側にもある（scripts/doctor.js の doctor_external_links）。
 * /doctor/ は hexo generate しないと見えず PR の時点では誰も見ないため、
 * Markdown 側は textlint に持たせて reviewdog に変更行へコメントさせる。
 * 許容する語彙は exempt.js で共有している。
 *
 * 対象は特設ページ（source/specials/）だけ。記事本文は #2346 で対象外
 * （技術記事の参照は94%が外部で、マークは情報にならない）。textlint には
 * ルールをパスで絞る仕組みが無いので、ルール側で見ている。
 */
const EXEMPT_TEXT = require("./exempt");

const NOTICE = "（外部サイト）";

// RFC 2606 の予約ドメイン。記法ガイドの見本（[リンクのテキスト](https://example.com/)）が
// 実リンクとして描画されるので、実在しないドメインは最初から外す
const EXAMPLE_HOST_RE = /^(?:[^/]*\.)?(?:example\.(?:com|net|org)|example|invalid|test|localhost)$/i;

// 自ブログ内。記法ガイドは絶対URLではなく /articles/... で書くよう案内しているが、
// 絶対URLで書かれても「外部サイト」と促すのは誤りなので除く。
// 同じホストでも /arch-guidelines/ のような別リポジトリのサイトは外部扱い（guidelines.ejs と同じ判断）
const INTERNAL_RE =
  /^https?:\/\/future-architect\.github\.io\/(?:articles|tags|categories|authors|series|specials|archives|page|doctor)\//i;

function textOf(node) {
  if (typeof node.value === "string") {
    return node.value;
  }
  if (Array.isArray(node.children)) {
    return node.children.map(textOf).join("");
  }
  return "";
}

function hostOf(url) {
  const m = /^https?:\/\/([^/?#]+)/i.exec(url);
  return m ? m[1] : "";
}

const reporter = function (context, options = {}) {
  const { Syntax, RuleError, report, fixer, getFilePath } = context;
  const include = options.include || ["source/specials/"];

  const filePath = (getFilePath() || "").replace(/\\/g, "/");
  // パスが取れないとき（文字列の lint）は判定できないので何も言わない
  if (!filePath || !include.some((dir) => filePath.includes(dir))) {
    return {};
  }

  return {
    [Syntax.Link](node) {
      const url = node.url || "";
      if (!/^https?:\/\//i.test(url)) return;
      if (INTERNAL_RE.test(url)) return;
      if (EXAMPLE_HOST_RE.test(hostOf(url))) return;

      const text = textOf(node).trim();
      // 画像だけのリンクは alt が名乗る。URL をそのまま書いたリンクはドメインが名乗る
      if (!text || /^https?:\/\//i.test(text)) return;
      if (EXEMPT_TEXT.some((word) => text.includes(word))) return;

      const last = node.children && node.children[node.children.length - 1];
      const message =
        `外部リンク「${text}」に${NOTICE}がありません` +
        `（リンクテキストから外部と読めないリンクには付ける。ブランド名・メディア名を名乗るリンクは対象外）`;

      // リンクテキストの末尾に足す。ガイドラインのポータル（themes/future/layout/guidelines.ejs）と同じ位置。
      // fixer に渡す range は report したノードからの相対（絶対位置を渡すと node.range[0] だけ後ろへずれる）
      if (last && last.range) {
        const at = last.range[1] - node.range[0];
        report(node, new RuleError(message, { fix: fixer.insertTextAfterRange([at, at], NOTICE) }));
        return;
      }
      report(node, new RuleError(message));
    },
  };
};

module.exports = {
  linter: reporter,
  fixer: reporter,
};
