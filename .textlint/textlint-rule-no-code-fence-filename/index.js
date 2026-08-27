/**
 * コードフェンスの言語欄にファイル名が入っている箇所を検出する（#2843）。
 *
 * hexo のコードフェンスは情報行を空白で切り、先頭を言語、残りをキャプション
 * （`<figcaption>`）として読む。ファイル名はキャプション欄に書く。
 *
 * 検出するのは2つの形。どちらも言語として解釈されず、プレーン表示になる。
 *
 * 1. **Qiita 記法の `lang:filename`。** 下書きは Qiita から持ってくるので、
 *    変換で残ると `go:main.go` 全体が言語名として渡り、強調表示もキャプションも
 *    消える。コロンを空白に置き換えるだけで直るので --fix を持つ
 * 2. **言語欄がファイル名だけ**（```` ```requirements.txt ````）。何語として
 *    描くかは中身を見ないと決められないため報告だけにする
 *
 * 言語かどうかは highlight.js に問い合わせる。手元の一覧を持つと、記事が
 * 増えるたびに追記が要るうえ、hexo が実際に描けるかとは別物になる。
 * `scripts/register_hljs_*.js` が足す言語（gomod / rego / terraform）と、
 * フィルタが横取りする独自フェンス（mermaid / csv / diff_*）はここに出てこない
 * ので、名前で通す。
 *
 * 拡張子は「記事に実際に書かれるファイルの拡張子」に限る。未登録の言語名を
 * 一律で報告すると `cue` `tree` `dir` のような言語でない指定まで拾い、
 * それは言語指定の話（no-mismatched-code-fence / #2505）で別の判断になる。
 */
const hljs = require("highlight.js");

// hljs に無いが、このリポジトリで言語として通る名前
const EXTRA_LANGS = new Set([
  "text",
  "txt",
  "none",
  "console",
  "gomod",
  "rego",
  "terraform",
  "tf",
  "mermaid",
  "csv",
  "tsv",
  "plantuml",
  "pu",
  "cue",
  "tree",
  "dir",
  "log",
]);

// ファイル名だと判断する拡張子。言語名と紛れるもの（`c` `r` `sh` 等）は
// 単独では言語として解決されるので、ここに挙げても誤検出にはならない
const FILE_EXTS = new Set(
  (
    "txt log java py go js ts tsx jsx json yaml yml tf sh bash rb rs dart swift sql md html css " +
    "scss styl vue toml ini env cfg conf properties xml csv tsv gradle cs cpp hcl ps1 psm1 pu puml " +
    "rego proto ahk lua kt php gitignore dockerignore lock mod sum"
  ).split(" ")
);

const isLang = (token) => {
  const name = token.toLowerCase();
  return Boolean(hljs.getLanguage(name)) || EXTRA_LANGS.has(name) || /^diff[_-]/.test(name);
};

// 拡張子を取り出す。`~/.aws/config` のようなパスと `.gitignore` のような
// ドットファイルも見る
const extOf = (token) => {
  const base = token.split("/").pop();
  const dotted = /^\.([A-Za-z][A-Za-z0-9]*)$/.exec(base);
  if (dotted) return dotted[1].toLowerCase();
  const m = /\.([A-Za-z0-9+]{1,12})$/.exec(base);
  return m ? m[1].toLowerCase() : null;
};

const looksLikeFile = (token) => {
  if (/\s/.test(token)) return false;
  const ext = extOf(token);
  return Boolean(ext) && FILE_EXTS.has(ext);
};

function reporter(context) {
  const { Syntax, RuleError, report, getSource, fixer } = context;

  return {
    [Syntax.CodeBlock](node) {
      const lang = node.lang || "";
      if (!lang) return;

      // 情報行はノードの1行目。fix の範囲はノード先頭からの相対で渡す
      const source = getSource(node);
      const firstLine = source.split("\n")[0];

      if (lang.includes(":")) {
        const idx = firstLine.indexOf(":");
        const left = firstLine.slice(0, idx).replace(/^[ \t]*(`{3,}|~{3,})/, "");
        const rest = firstLine.slice(idx + 1);
        // 言語が書かれていない `:requirements.txt` の形は、何語で描くかを
        // 決められないので直さない
        if (!left.trim()) {
          report(
            node,
            new RuleError(
              `コードフェンスに言語がありません（\`${lang}\` はファイル名が言語名として渡ります）。` +
                "言語を書いて、ファイル名は空白のあとに続けます",
              { index: 0 }
            )
          );
          return;
        }
        const message =
          "コードフェンスのファイル名は空白で区切ります" +
          `（Qiita 記法の \`${lang}\` は全体が言語名として渡り、強調表示とキャプションが消えます）`;
        const tail = rest.replace(/^[ \t]+/, "");
        report(
          node,
          new RuleError(message, {
            index: 0,
            fix: fixer.replaceTextRange([idx, firstLine.length], ` ${tail}`),
          })
        );
        return;
      }

      if (!isLang(lang) && looksLikeFile(lang)) {
        report(
          node,
          new RuleError(
            `コードフェンスの \`${lang}\` は言語として解釈されません（プレーン表示になります）。` +
              "言語を書いて、ファイル名は空白のあとに続けます",
            { index: 0 }
          )
        );
      }
    },
  };
}

// --fix を効かせるには linter / fixer の対で公開する（関数を直接エクスポート
// すると報告だけの規則として扱われ、fix が捨てられる）
module.exports = {
  linter: reporter,
  fixer: reporter,
};
