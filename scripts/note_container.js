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
hexo.extend.filter.register('before_post_render', function(data) {
  // インデントに対応するよう正規表現を修正
  // ^(\s*): 行頭のインデント（スペース）をキャプチャ(group 1)
  // \1:::  : 開始タグと同じインデントを持つ終了タグにマッチ
  const regex = /^(\s*):::\s+note(?:\s+(\w+))?\n([\s\S]+?)\n\1:::$/gm;

  data.content = data.content.replace(regex, (match, indent, specifiedClass, content) => {

    let className = 'info'; // デフォルトのクラス名
    const allowedClasses = ['info', 'warn', 'alert'];
    if (specifiedClass && allowedClasses.includes(specifiedClass)) {
      className = specifiedClass;
    }

    // キャプチャしたコンテナ内のコンテンツから、共通のインデントを削除
    // これにより、Markdownレンダラが意図せずコードブロックとして解釈するのを防ぐ
    const unindentedContent = content.split('\n').map(line => {
      if (line.startsWith(indent)) {
        return line.substring(indent.length);
      }
      return line;
    }).join('\n');

    // インデントを削除したコンテンツをMarkdownとして正しくレンダリング
    const renderedContent = hexo.render.renderSync({ text: unindentedContent, engine: 'markdown' });

    // コードブロックとして認識されてしまわないよう、インデントされないよう愚直に文字列結合
    let html = `<div class="note-container ${className}">`
      + `<span class="fa-check-circle"></span>`
      + `<div>${renderedContent.trim()}</div>`
      + `</div>`;

    return html
  });

  return data;
});
