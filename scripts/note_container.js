/**
 * カスタムコンテナを置換するフィルター
 *
 * 使い方:
 * ::: note [class]
 * content
 * :::
 *
 * 例:
 * ::: note info
 * これは注釈です。
 * :::
 */
hexo.extend.filter.register('before_post_render', function (data) {
  // ^([ \t]*): 行頭のインデントをキャプチャし、同じインデントの終了タグ（\1:::）と対にする。
  // 水平空白に限るのが要点で、\s にすると改行まで飲み、直前の空行から
  // マッチが始まって \1 に「\n」が入る。すると閉じ側に「空行＋:::」を要求してしまい、
  // 直後の ::: を素通りして後続ブロックの :::（表の後の空行付き等）まで
  // 1つの note に飲み込む。この取り違えで23記事の描画が壊れていた
  const regex = /^([ \t]*):::[ \t]+note(?:[ \t]+(\w+))?\n([\s\S]+?)\n\1:::$/gm;

  data.content = data.content.replace(regex, (match, indent, specifiedClass, content) => {
    let className = 'info'; // デフォルトのクラス名
    const allowedClasses = ['tip', 'info', 'warn', 'alert'];
    if (specifiedClass && allowedClasses.includes(specifiedClass)) {
      className = specifiedClass;
    }

    // キャプチャしたコンテナ内のコンテンツから、共通のインデントを削除
    // これにより、Markdownレンダラが意図せずコードブロックとして解釈するのを防ぐ
    const unindentedContent = content
      .split('\n')
      .map((line) => {
        if (line.startsWith(indent)) {
          return line.substring(indent.length);
        }
        return line;
      })
      .join('\n');

    // インデントを削除したコンテンツをMarkdownとして正しくレンダリング
    const renderedContent = hexo.render.renderSync({ text: unindentedContent, engine: 'markdown' });

    // コードブロックとして認識されてしまわないよう、インデントされないよう愚直に文字列結合
    let html =
      `<div class="note-container ${className}">` +
      `<span class="fa-check-circle"></span>` +
      `<div>${renderedContent.trim()}</div>` +
      `</div>`;

    return html;
  });

  return data;
});
