'use strict';

// markdown-itのインスタンスを初期化
var md = require('markdown-it')({
  html: true,      // HTMLタグを許可
  linkify: true,   // URLのようなテキストを自動でリンクに変換
});

/**
 * 記事内の脚注をレンダリングする関数
 * @param {String} text 記事のコンテンツ
 * @returns {String} 処理後のテキスト
 */
function renderFootnotes(text) {
  // 脚注の名前と内容を格納するオブジェクト
  const footnotesByName = {};
  // 記事内での脚注の出現順を格納する配列
  let orderedFootnotes = [];
  let html = '';

  // 正規表現を更新: \d+ (数字) だけではなく [\w-]+ (英数字, _, -) にする。[^example] という脚注にも対応したいため
  // https://qiita.com/phigasui/items/010f4c79ff47bbaaebdd
  const reFootnoteContent = /\[\^([\w-]+)\]: ?([\S\s]+?)(?=\[\^(?:[\w-]+)\]:|\n\n|$)/g;
  const reInlineFootnote = /\[\^([\w-]+)\]\((.+?)\)/g;
  const reFootnoteIndex = /\[\^([\w-]+)\]/g;

  // 1. インライン形式の脚注 [^name](content) を処理
  text = text.replace(reInlineFootnote, function(match, name, content) {
    footnotesByName[name] = { content: content.trim() };
    return '[^' + name + ']'; // 本文からは内容を削除し、参照のみ残す
  });

  // 2. 脚注の定義部分 [^name]: content を処理
  text = text.replace(reFootnoteContent, function(match, name, content) {
    footnotesByName[name] = { content: content.trim() };
    return ''; // 本文から脚注定義を削除
  });

  // 3. 本文中の脚注参照をスキャンし、出現順のリストを作成
  const seen = {};
  text.replace(reFootnoteIndex, function(match, name) {
    // 未処理かつ定義が存在する脚注のみをリストに追加
    if (!seen[name] && footnotesByName[name]) {
      orderedFootnotes.push({
        name: name,
        content: footnotesByName[name].content
      });
      seen[name] = true;
    }
    return match;
  });

  // 脚注がなければ何もしない
  if (orderedFootnotes.length === 0) {
    return text;
  }

  // 4. 本文中の脚注参照 [^name] をHTMLタグに置換
  text = text.replace(reFootnoteIndex, function(match, name) {
    let index = -1;
    for (let i = 0; i < orderedFootnotes.length; i++) {
      if (orderedFootnotes[i].name === name) {
        index = i + 1;
        break;
      }
    }
    // 脚注番号が見つかった場合のみ置換
    if (index > 0) {
      return `<sup id="fnref:${name}"><a href="#fn:${name}" rel="footnote">${index}</a></sup>`;
    }
    return match; // 見つからなければ元のテキストを返す
  });

  // 5. 脚注リストのHTMLを生成
  orderedFootnotes.forEach(function(footNote, i) {
    const index = i + 1; // 脚注番号は1から始まる連番
    html += `<li id="fn:${footNote.name}">`;
    html += `<span style="vertical-align: top; padding-right: 10px;">${index}.</span>`;
    html += `<span style="vertical-align: top;">${md.renderInline(footNote.content)}</span>`;
    html += ` <a href="#fnref:${footNote.name}" rev="footnote">↩</a>`;
    html += `</li>`;
  });

  // 6. 脚注リストを記事の末尾に追加
  if (html) {
    text += '<div id="footnotes">';
    text += '<hr>';
    text += '<div id="footnotelist">';
    text += '<ol style="list-style:none; padding-left: 0;">' + html + '</ol>';
    text += '</div></div>';
  }

  return text;
}

// Hexoフィルターに登録
hexo.extend.filter.register('before_post_render', function(data) {
  if (data.layout === 'post' || data.layout === 'page') {
    data.content = renderFootnotes(data.content);
  }
  return data;
});
