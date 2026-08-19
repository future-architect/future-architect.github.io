/**
 * Markdown 記法 `![alt](src)` で書かれた画像を検出する。
 *
 * このブログの画像は `<img>` タグで書く。Markdown 記法には width / height と
 * loading を書けず、レイアウトシフトと画面外の先読みが避けられないため
 * （CLAUDE.md の記法例、#2605 / #2645）。
 *
 * **寄稿者に書き方を強いるルールではない。** 記法ガイド（`/specials/markdown/`）は
 * `![alt](url)` で書いてもらう案内で、公開するときにこちらで HTML へ変換する（#2559）。
 * つまりリポジトリに入った時点では変換済みのはずで、ここで拾えるのは変換漏れになる。
 *
 * 生 HTML を見る no-img-without-dimensions / no-img-without-lazy はこの形を
 * 見つけられない。remark が Image ノードとして扱い、タグの文字列が本文に
 * 現れないため（#2644）。逆にこちらは Image ノードだけを見るので、コードブロックや
 * インラインコードの中の記法は初めから対象外になる。
 *
 * 実寸は画像を測らないと分からないので --fix は持たない。
 */
function reporter(context) {
  const { Syntax, RuleError, report, getSource } = context;

  return {
    [Syntax.Image](node) {
      // alt にページの説明文が丸ごと入っている記事があるので、指摘は短く切る
      const source = getSource(node);
      const excerpt = source.length > 60 ? `${source.slice(0, 60)}…` : source;
      report(
        node,
        new RuleError(
          `画像は img タグで書きます（\`${excerpt}\` は Markdown 記法。` +
            `実寸の width / height と loading="lazy" を付けるため、公開時に変換します）`
        )
      );
    },
  };
}

module.exports = reporter;
