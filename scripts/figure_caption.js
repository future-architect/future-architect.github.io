'use strict';

/**
 * 画像の直後に置かれた斜体だけの段落を、キャプションとして figure にまとめるフィルター。
 *
 *   <img src="...">
 *   *図1　キャプション*
 *      ↓
 *   <figure><img src="..."><figcaption>図1　キャプション</figcaption></figure>
 *
 * 記法は Zenn に合わせた（画像のすぐ下の行を `*` で挟む）。Markdown 自体には
 * キャプションの概念がなく、`![alt](url "title")` の title はツールチップで別物。
 * 出力側は figure/figcaption が意味的に正しいので、記法と出力を分けて橋渡しする。
 * alt は画像が見えない人への代替テキスト、キャプションは全員向けの補足なので、
 * alt を流用はしない（#2517）。
 *
 * 生の <img> は marked が <p> で包まないが、Markdown 記法の ![]() は包む。
 * 当ブログは前者が主流だが、両方が混在するのでどちらも受ける。
 *
 * `出典：URL` をリンク化する autolink_image_source.js と同じ after_post_render で
 * 動くため、優先度を下げて後に回す。
 */
const IMG = '(?:<a\\b[^>]*>\\s*)?<img\\b[^>]*>(?:\\s*</a>)?';
const CAPTION = '<p><em>((?:(?!</em>)[\\s\\S])+)</em></p>';
const PATTERN = new RegExp(`(?:<p>\\s*(${IMG})\\s*</p>|(${IMG}))\\s*${CAPTION}`, 'g');

function toFigure(content) {
  return content.replace(PATTERN, (match, wrapped, bare, caption) => {
    const image = wrapped || bare;
    if (!image) {
      return match;
    }
    return `<figure>${image}<figcaption>${caption}</figcaption></figure>`;
  });
}

hexo.extend.filter.register(
  'after_post_render',
  function (data) {
    if (!data || !data.content) {
      return;
    }
    data.content = toFigure(data.content);
    return data;
  },
  20,
);

module.exports = { toFigure };
