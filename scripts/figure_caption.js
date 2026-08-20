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
const { replaceOutsideFences } = require('./lib/fence');

/**
 * 画像の行と、その直下のキャプション行の間に空行を入れる（#2553）。
 *
 * 行頭の <img> から始まる塊を marked は HTML ブロックとして扱い、空行までを
 * raw のまま出す。そのため直下に書いた `*…*` は <em> にならず、下の
 * after_post_render が探している形（<p><em>…</em></p>）にならない。
 * 記法は「直下の行」と決まっている（#2517）ので、実装側で空行を補う。
 *
 * キャプションの中身は空行を空けたあとに marked が描くため、`code` や
 * リンクといったインライン記法もそのまま効く。
 */
const IMAGE_LINE = '(?:<a\\b[^>]*>\\s*)?<img\\b[^>]*>(?:\\s*</a>)?|!\\[[^\\]]*\\]\\([^)\\n]*\\)';
const CAPTION_LINE = '[ \\t]*\\*[^*\\n]+\\*[ \\t]*';
const BLANK_BEFORE_CAPTION = new RegExp(
  `^([ \\t]*(?:${IMAGE_LINE})[ \\t]*)\\n(?=${CAPTION_LINE}$)`,
  'gm',
);

/**
 * 画像・キャプションの塊が前後の段落とくっついているときに空行で切り離す（#2517）。
 *
 * 画像の行を直前の文に続けて書くと marked は画像を段落の中に入れ、キャプションを
 * 続けて書くと `<p><em>…</em><br>本文</p>` になる。どちらも下の toFigure が探す形に
 * ならず、記法どおりに書いたのにキャプションが素の斜体で出る。
 */
const BLANK_BEFORE_IMAGE = new RegExp(
  `^(?![ \\t]*(?:#|>|[-*+][ \\t]|[0-9]+\\.[ \\t]|\\||<|!\\[))[ \\t]*(\\S.*?)[ \\t]*\\n` +
    `(?=[ \\t]*(?:${IMAGE_LINE})[ \\t]*\\n(?:[ \\t]*\\n)?${CAPTION_LINE}$)`,
  'gm',
);
const BLANK_AFTER_CAPTION = new RegExp(
  `^([ \\t]*(?:${IMAGE_LINE})[ \\t]*\\n(?:[ \\t]*\\n)?${CAPTION_LINE})\\n(?=[ \\t]*\\S)`,
  'gm',
);

const IMG = '(?:<a\\b[^>]*>\\s*)?<img\\b[^>]*>(?:\\s*</a>)?';
const CAPTION = '<p>\\s*<em>((?:(?!</em>)[\\s\\S])+)</em>\\s*</p>';
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

hexo.extend.filter.register('before_post_render', function (data) {
  if (!data || !data.content) return;
  // コードフェンスの中の見本は記法の説明なので触らない (#2549)
  data.content = replaceOutsideFences(data.content, BLANK_BEFORE_IMAGE, (m, line) => `${line}\n\n`);
  data.content = replaceOutsideFences(
    data.content,
    BLANK_BEFORE_CAPTION,
    (m, line) => `${line}\n\n`,
  );
  data.content = replaceOutsideFences(
    data.content,
    BLANK_AFTER_CAPTION,
    (m, block) => `${block}\n\n`,
  );
  return data;
});

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
