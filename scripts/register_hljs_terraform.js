'use strict';

// highlightjs-terraform/terraform をhighlight.js に追加
const hljs = require('highlight.js');
const registerTerraform = require('highlightjs-terraform/terraform');
registerTerraform(hljs);

// hexo filterで用いるヘルパー関数
const terraformFilter = (data) => {
  if (data.layout !== 'post' && data.layout !== 'page') {
    return;
  }

  const regex = /^(\s*)```(tf|hcl|terraform)\b(.*)\n([\s\S]+?)\n\s*```/gm;

  data.content = data.content.replace(regex, (match, indent, lang, meta, code) => {
    const highlighted = hljs.highlight(code, { language: 'terraform', ignoreIllegals: true });

    // 'hljs-' プレフィックスを全て除去
    const codeWithoutPrefix = highlighted.value.replace(/hljs-/g, '');

    // 空行を <span class="line"></span><br> に置換し、marked 側で <p> を差し込まれるのを防ぐ
    const escapedHTML = codeWithoutPrefix.split('\n\n').join('\n<span class="line"></span>\n');

    const captionText = meta.trim();
    let finalHtml = '';

    // Hexoの標準的な出力形式である<figure>タグで全体を囲む
    finalHtml += `<figure class="highlight ${lang}">`;

    // ファイル名（キャプション）が指定されていれば、<figcaption>を追加
    if (captionText) {
      finalHtml += `<figcaption><span>${captionText}</span></figcaption>`;
    }

    finalHtml += `<table><tbody><tr><td class="code"><pre>${escapedHTML}</pre></td></tr></tbody></table></figure>`;

    // 元のインデントを維持して返す
    return indent + finalHtml;
  });
};

// Terraformのコードブロックを有効にするため、hexoのフィルターで横取りする
// 'before_post_render' は、MarkdownがHTMLに変換される直前のタイミング
// 優先度(priority)を低く設定し、他のプラグインより先に動かす
hexo.extend.filter.register('before_post_render', terraformFilter, 9);
