/**
 * <img>タグの直後にある「出典：URL...」形式のテキストを、複数のURLに対応して自動でリンク化するフィルター
 */
hexo.extend.filter.register('after_post_render', function(data) {
  // 投稿の本文（data.content）に対して処理を行う
  if (!data || !data.content) {
    return;
  }

  // <img>タグ、間のテキスト、「出典：」、そしてその後のURL群を含むテキスト、というパターンを探す正規表現
  // [^<]+ は、次のHTMLタグが現れるまでの全てのテキストをキャプチャする
  const blockRegex = /(<img [^>]+>)([\s\S]*?出典：)([^<]+)/g;

  data.content = data.content.replace(blockRegex, (match, imgTag, sourcePrefix, urlsText) => {

    // キャプチャしたURL群のテキスト (urlsText) の中から、個々のURLを探すための正規表現
    const urlRegex = /(https?:\/\/[^\s<]+)/g;

    // 見つかった全てのURLを<a>タグで囲むように置換する
    // urlパラメータにはマッチした個々のURL文字列が入る
    const linkedUrls = urlsText.trim().replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });

    // 元の<img>タグ + 「出典：」までのテキスト + リンク化されたURL群 を結合して返す
    return imgTag + sourcePrefix + ' ' + linkedUrls;
  });

  return data;
});
