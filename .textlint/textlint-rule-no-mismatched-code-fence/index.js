/**
 * shell 系コードフェンスの言語指定が中身と噛み合っていない箇所を検出する（#2505）。
 *
 * highlight.js では言語名がふるまいを決める:
 *   sh / bash / zsh              → Bash（スクリプトとして解釈）
 *   console / shell / shellsession → Shell Session（プロンプト付きの画面として解釈）
 *   terminal                     → 未登録（プレーン表示）
 *
 * 噛み合わないと強調表示が丸ごと消える。`bash` にプロンプト付きのセッションを渡すと
 * `$` がコマンドの一部として扱われて行ごと無着色になり、逆に `console` にスクリプトを
 * 渡すとプロンプトが1つも無いため全体が無着色になる。加えて `bash` 指定のセッションでは
 * 出力行までシェルの構文として着色される（実データで2,258箇所）。
 *
 * 判定はプロンプト行の有無だけで行う。`#` 始まりは見ない（シェルのコメントと
 * root プロンプトを機械で区別できず、実データでは注釈が大半だった）。
 */
const SCRIPT = new Set(["sh", "bash", "zsh"]);
const SESSION = new Set(["console", "shellsession"]);
// 名前がふるまいと食い違うので語彙から外したもの
const BANNED = new Map([
  ["shell", "セッションは console、スクリプトは bash か sh"],
  ["shellsession", "console に揃える"],
  ["terminal", "highlight.js に登録が無くプレーン表示になる。console / bash / text のいずれか"],
]);

const DOLLAR = /^\s*(?:\([^)]*\)\s*)?(?:[\w.-]+@[\w.-]+[^\s$]*)?\$\s+\S/;
const PS = /^\s*(?:PS [^>]*>|[A-Z]:\\[^>]*>)\s*\S/;
const hasPrompt = (code) =>
  code.split("\n").some((l) => DOLLAR.test(l) || PS.test(l));

module.exports = function (context) {
  const { Syntax, RuleError, report, getSource } = context;

  return {
    [Syntax.CodeBlock](node) {
      // lang は ```sh の直後の語。ファイル名のキャプションは含まれない
      const lang = (node.lang || "").toLowerCase();
      if (!lang) return;

      const code = getSource(node);
      const prompt = hasPrompt(code);

      if (BANNED.has(lang)) {
        report(
          node,
          new RuleError(
            `コードフェンスの \`${lang}\` は使いません（${BANNED.get(lang)}）`,
            { index: 0 }
          )
        );
        return;
      }
      if (SCRIPT.has(lang) && prompt) {
        report(
          node,
          new RuleError(
            `プロンプト付きの画面なので \`console\` にします（\`${lang}\` だと $ がコマンドの一部として扱われ、強調表示が消えます）`,
            { index: 0 }
          )
        );
        return;
      }
      if (SESSION.has(lang) && !prompt) {
        report(
          node,
          new RuleError(
            "プロンプトが無いので `console` ではなく `bash`（コマンド）か `text`（実行結果・ログ）にします",
            { index: 0 }
          )
        );
      }
    },
  };
};
