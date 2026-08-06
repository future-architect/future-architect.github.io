'use strict';

/**
 * 記事本文の最初の画像に fetchpriority="high" を付けるフィルター。
 *
 * 記事冒頭の画像は LCP 要素になりやすいが、既定では他のリソースと同じ
 * 優先度で読み込まれるため、表示が遅れて LCP を悪化させる。
 * ブラウザに最優先で取得するよう指示する。
 *
 * 本文の画像は Markdown 記法ではなく <img> タグを直接書く運用のため、
 * 記事側を書き換えるには1400本以上に手を入れる必要がある。ここで
 * 一括処理することで、記事は変更せずに済む。
 *
 * 置換は最初の1つだけ。String#replace に非グローバルの正規表現を渡すと
 * 最初の一致しか置換されないため、2枚目以降は対象にならない。
 * 先頭画像は画面内に入るので、lazy 読み込みも外す（LCP候補に lazy が
 * 付いていると Lighthouse でも減点される）。
 */
hexo.extend.filter.register('after_post_render', function(data) {
  // 属性値の中に > が入ることがある（alt にコード片が書かれている記事がある）ため、
  // 引用符で囲まれた範囲を読み飛ばしながらタグの終端を探す
  data.content = data.content.replace(/<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/i, tag => {
    // 同じタグに loading="lazy" が2回書かれている記事があるため、タグ内は全て除去する
    let t = tag.replace(/\s+loading\s*=\s*(["']?)lazy\1/gi, '');
    if (!/\bfetchpriority=/i.test(t)) {
      t = t.replace(/<img\b/i, '<img fetchpriority="high"');
    }
    return t;
  });
  return data;
});
