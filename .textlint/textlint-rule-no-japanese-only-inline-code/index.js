/**
 * 日本語だけのインラインコード（`続行` `上書き` `申し込みボタンをクリックする`）を検出する。
 *
 * インラインコードはコードを指す印で、日本語の装飾に使うものではない（#2609）。
 * Chrome のページ翻訳は <code> の中を訳さないので、装飾で囲った日本語は翻訳しても原文のまま残る。
 *
 * 対象は「漢字・かな・カタカナと空白だけ」で構成される Code ノード。
 * 英数字も記号も1文字も無いものに絞ることで、コードとして正当な形が自動的に外れる:
 *   `{プロジェクトID}`（プレースホルダ）、`技術選定.md`（日本語ファイル名）、
 *   `-- 成績`（SQL のコメント）、`string型`、`localhost:ポート番号`
 * 全角記号を含むもの（`「ステップバイステップで考えてください」`、`品川区、東京都`）も外れる。
 * LLM へのプロンプトやサンプルデータの値は機械への入力なのでコード扱いが妥当（620件を目視）。
 */
// 々〆ー は Script=Common なので個別に足す
const JAPANESE_ONLY =
  /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}々〆ー\s]+$/u;
// `rising` → `上昇` の値側。コード上の文字列リテラルなのでインラインコードが正しい
const MAPPED_VALUE = /`[^`\n]*[0-9A-Za-z][^`\n]*`\s*(?:→|⇒|=>|➡|:|：)\s*$/;

module.exports = function (context) {
  const { Syntax, RuleError, report, getSource } = context;
  const source = getSource();

  return {
    [Syntax.Code](node) {
      if (!JAPANESE_ONLY.test(node.value)) {
        return;
      }
      const lineStart = source.lastIndexOf("\n", node.range[0] - 1) + 1;
      if (MAPPED_VALUE.test(source.slice(lineStart, node.range[0]))) {
        return;
      }
      report(
        node,
        new RuleError(
          `\`${node.value}\` は日本語だけのインラインコードです（UI のラベルは「」、意味の強調は太字にします。<code> の中はブラウザの翻訳が効きません）`,
          { index: 0 }
        )
      );
    },
  };
};
