'use strict';

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
  // ::: note [class] ... ::: の記法にマッチする正規表現
  const regex = /^:::\s+note(?:\s+(\w+))?\n([\s\S]+?)\n:::$/gm;

  data.content = data.content.replace(regex, (match, specifiedClass, content) => {

    let className = 'info'; // デフォルトのクラス名
    const allowedClasses = ['info', 'warn', 'alert'];
    if (specifiedClass && allowedClasses.includes(specifiedClass)) {
      className = specifiedClass;
    }

    // コンテナ内のコンテンツをMarkdownとして正しくレンダリング
    const renderedContent = hexo.render.renderSync({ text: content, engine: 'markdown' });

    // コードブロックとして認識されてしまわないよう、インデントされないよう愚直に文字列結合
    let html = `<div class="note-container ${className}">`
      + `<span class="fa-check-circle"></span>`
      + `<div>${renderedContent.trim()}</div>`
      + `</div>`;

    return html
  });

  return data;
});
