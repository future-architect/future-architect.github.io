'use strict';

// hexo-renderer-marked はで拡張できる
// https://github.com/hexojs/hexo-renderer-marked
//
// もとの markd を参考に拡張する
// https://github.com/markedjs/marked/blob/e5796ecc435a30f96939e6a7b2229c14264b4bf8/src/Renderer.js#L92
hexo.extend.filter.register('marked:renderer', function (renderer) {
  // renderer は1ページの描画ごとに作り直されるので、直前の見出しと既出のラベルを
  // ここに持てばページ単位で数えられる (#3231)
  const heading = renderer.heading;
  renderer.heading = function (text, level, ...rest) {
    this._lastHeading = plainText(text);
    return heading.call(this, text, level, ...rest);
  };
  renderer.table = function (header, body) {
    this._tableLabels ||= new Set();
    const label = uniqueLabel(regionLabel(header), this._lastHeading, this._tableLabels);
    return `<div class="scroll" tabindex="0" role="region" aria-label="${label}">${table(header, body)}</div>\n`;
  };
});

const table = (header, body) => {
  if (body) body = '<tbody>' + body + '</tbody>';

  return '<table>\n' + '<thead>\n' + header + '</thead>\n' + body + '</table>';
};

const plainText = (html) =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * 横スクロールする器の読み上げ名を、1行目の見出しから組む (#2961)。
 *
 * `.scroll` は overflow-x: auto なので、tabindex が無いとキーボードだけでは
 * 横に振れない（WCAG 2.1.1・レベル A）。全727件の表に付けるのは、
 * **どの表が溢れるかをビルド時に判定できない**ため。表の中には CSS で寸法を
 * 持つ要素（スタイルガイドの色見本など）が入り、Markdown からは幅が分からない。
 * 実際、溢れる幅を Markdown から見積もる案は実測（12個中2個が溢れる）に
 * 対して0個と外れた。
 *
 * 表を持つ記事は374本（全体の25%）で、その中の中央値は1個。増えるタブ停止は
 * 1記事あたり中央値1個で、溢れていない表でも「表がある」ことは読み上げられる。
 *
 * 名前を列名から作るのは、1ページに複数の表があると「表」だけでは区別できないため。
 */
const regionLabel = (header) => {
  const names = (header.match(/<th[^>]*>([\s\S]*?)<\/th>/g) || []).map(plainText).filter(Boolean);
  if (!names.length) return '表';
  // 長い見出しが並ぶ表もあるので頭を取る。
  const joined = names.join(' / ').slice(0, 60);
  return `表 ${joined}`;
};

/**
 * 同じ列名の表が同じページに並ぶと名前が重複する (#3231。axe landmark-unique)。
 * 2つ目以降は直前の見出しを先に置く。連番は順序しか言わないが、見出しは
 * どの節の表かを言う。見出しが無いか、足しても重なるときだけ連番に落とす。
 */
const uniqueLabel = (base, heading, used) => {
  const candidates = [base];
  if (heading) candidates.push(`${heading.slice(0, 40)}の${base}`);
  let label = candidates.find((c) => !used.has(c));
  for (let n = 2; !label; n++) {
    const numbered = `${candidates.at(-1)}（${n}）`;
    if (!used.has(numbered)) label = numbered;
  }
  used.add(label);
  // **& は再エスケープしない。** header は marked が出した HTML で、本文の & は
  // すでに &amp; になっている。もう一度潰すと &amp;amp; になって読み上げに出る
  return label.replace(/"/g, '&quot;').replace(/</g, '&lt;');
};
