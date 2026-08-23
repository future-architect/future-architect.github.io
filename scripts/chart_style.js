'use strict';

/**
 * カテゴリ由来でない系列の色と、折れ線の太さ (#2767)。ここが唯一の定義場所で、
 * 週別の積み上げ・タグの定着・著者の推移が同じ段を共有する。
 *
 * 濃い2段はブランドネイビー、淡い側は無彩色に抜ける。青は主役の2段だけなので、
 * 積み上げのどこまでが手前の段かがひと目で分かる。
 * echarts の option では CSS 変数を参照できないため、ネイビーとクリムゾンは
 * 同値をリテラルで持つ（フッターの波と同じ扱い）。
 *
 * カテゴリの色は category_chart_helpers.js が持つ。混ぜない
 * （カテゴリは順序に意味が無いので色相で分ける、こちらは順序があるので濃淡）。
 */
const NAVY_STEPS = ['#0a1461', '#3f4577', '#9e9e9e', '#c6c6c6', '#e0e0e0'];

// 積み上げの上に重なる折れ線は、濃淡では沈むので色相を変える
const LINE_ACCENT = '#d5004a';

// kind ごとに要る本数だけ返す。echarts の color は系列の順に当たるので、
// 著者の推移は「継続・再開・新規・常連（線）」の順に並べる。
// 2色しか使わないタグの定着は、淡い端ではなくグレーの一番濃い段を取る
// （段を飛ばすと相手が無いので、薄い側が弱いだけになる）
const PALETTES = {
  weeks: NAVY_STEPS,
  retention: [NAVY_STEPS[0], NAVY_STEPS[2]],
  author_types: [NAVY_STEPS[0], NAVY_STEPS[1], NAVY_STEPS[2], LINE_ACCENT],
};

hexo.extend.helper.register('chart_series_colors', function (kind) {
  return JSON.stringify(PALETTES[kind] || NAVY_STEPS);
});

// 年別の折れ線（最新年から遡る5本）の太さ。先頭が最新年で、そこから1pxずつ落とす。
// 重なりの前後と太さを同じ向きに揃えて、古い年が背景になるようにする
const LINE_WIDTHS = [8, 7, 6, 5, 4];

// 積み上げの上に重ねる1本の太さ（著者の推移の「常連」）。上の5本とは役割が
// 違うので値を分ける。あちらは並んだ線の順序を太さで表すが、こちらは1本しかない
const ACCENT_LINE_WIDTH = 6;

hexo.extend.helper.register('chart_line_widths', function () {
  return JSON.stringify(LINE_WIDTHS);
});

hexo.extend.helper.register('chart_accent_line_width', function () {
  return ACCENT_LINE_WIDTH;
});
