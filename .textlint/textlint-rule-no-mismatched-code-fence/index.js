/**
 * shell 系コードフェンスの言語指定が中身と噛み合っていない箇所を検出する（#2505）。
 *
 * highlight.js では言語名がふるまいを決める:
 *   sh / bash / zsh              → Bash（スクリプトとして解釈）
 *   console / shell / shellsession → Shell Session（端末の画面として解釈）
 *   terminal                     → 未登録（プレーン表示）
 *
 * `bash` にプロンプト付きの画面を渡すと、プロンプト記号がコマンドの一部として
 * 扱われて構文解析が壊れ、行ごと無着色になる。加えて出力行までシェルの構文として
 * 着色される（実データで2,258箇所）。
 *
 * Shell Session がプロンプトとして切り出すのは行頭の `$` `%` `>` `#` の4つ
 * （実測。`❯` `➜` `PS >` `dbname=#` は認識しない）。認識しない形でも
 * Shell Session なら無着色で済み、誤着色は起きない。
 *
 * ルールが見るのは2つだけ:
 *   1. 名前とふるまいが食い違う指定を使っていないか（shell / shellsession / terminal）
 *   2. `sh` / `bash` / `zsh` にプロンプト行が無いか
 *
 * **`console` の中身は問わない。** 端末の画面という意味づけは書き手が決めることで、
 * 実行結果だけのブロックも「端末に出た内容」として console が正しい。
 * プロンプトが無い console は無着色になるが、`text` と同じ描画で害は無い。
 * 強調表示が欲しければ `$` を書き足す（言語を変えるのではなく記述を直す）。
 *
 * `#` はプロンプト判定に使わない。シェルのコメントと root プロンプトを機械で
 * 区別できず、実データでは `# MacOSの場合` のような注釈が大半だった。
 */
const SCRIPT = new Set(["sh", "bash", "zsh"]);
// 名前がふるまいと食い違うので語彙から外したもの
const BANNED = new Map([
  ["shell", "端末の画面は console、実行するコードは bash か sh"],
  ["shellsession", "console に揃える"],
  [
    "terminal",
    "highlight.js に登録が無くプレーン表示になる。console（端末の画面）か bash（実行するコード）",
  ],
]);

// Shell Session が実際にプロンプトとして切り出す形だけを見る。
//
// 記号の直後に空白が無い書き方（`$go run main.go`、`>aws dynamodb scan`）も
// 実記事にあり、highlight.js も認識する。ただし空白を許すと変数と紛れるので、
// 続く文字を「空白・小文字・`/`・`.`」に限る。`${FIND_DIR}="x"` や
// `$GOPATH/src` をプロンプトと誤認しないため（前者は実記事で踏んだ）。
//
// `>` は npm の出力（`> vite build`）とも紛れるが、その場合も端末の画面の
// 一部なので console が正しく、誤る向きが安全側になる。
const PROMPT = [
  /^[ \t]*\$(?:[ \t]+|(?=[a-z./]))\S/,
  /^[ \t]*%(?:[ \t]+|(?=[a-z./]))\S/,
  /^[ \t]*>(?:[ \t]+|(?=[a-z./\\]))\S/,
];
const hasPrompt = (code) =>
  code.split("\n").some((l) => PROMPT.some((re) => re.test(l)));

module.exports = function (context) {
  const { Syntax, RuleError, report, getSource } = context;

  // 中身は node.value を使う。getSource() は原文をそのまま返すため、
  // 引用（blockquote）の中のコードブロックでは各行に付く `> ` まで含まれ、
  // 引用記号を cmd のプロンプトと取り違える（実記事の 20251022a で踏んだ）
  const codeOf = (node) => (typeof node.value === "string" ? node.value : getSource(node));

  return {
    [Syntax.CodeBlock](node) {
      const lang = (node.lang || "").toLowerCase();
      if (!lang) return;

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
      if (SCRIPT.has(lang) && hasPrompt(codeOf(node))) {
        report(
          node,
          new RuleError(
            `プロンプト付きの画面なので \`console\` にします（\`${lang}\` だとプロンプト記号がコマンドの一部として扱われ、強調表示が消えます）`,
            { index: 0 }
          )
        );
      }
    },
  };
};
