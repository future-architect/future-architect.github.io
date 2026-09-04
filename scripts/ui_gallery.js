'use strict';

/**
 * 部品ギャラリー（/specials/gallery/）が使うデータ (#2985)。
 *
 * **見本は実物の partial を呼んで描く。** 文章で書いた見本は腐るので、
 * ここが返すのはアイコンの名前と実データだけで、見た目は gallery.ejs が
 * 本物を呼んで出す（スタイルガイドが色を _variables.styl から引くのと同じ流儀 #2856）。
 *
 * 部品の分類（見本あり / 見本なし / 未分類）は scripts/lib/ui_partials.js が持ち、
 * ui_partials_lint.mjs が検査する。
 */

const fs = require('fs');
const path = require('path');
const { getGA4PV } = require('./lib/ga4');

const LAYOUT_DIR = path.join(hexo.theme_dir, 'layout');

/**
 * アイコンの一覧は辞書から出す (#3054)。手で並べていたときは、
 * 辞書に無い名前が5件混ざり、svg-icon.ejs が何も出さないまま
 * ラベルだけが並んでいた。辞書は svg-icon.ejs の JS ブロックの中にあって
 * require できないので、キーだけを読み出す
 */
hexo.extend.helper.register('ui_icon_names', function () {
  const src = fs.readFileSync(path.join(LAYOUT_DIR, '_partial', 'svg-icon.ejs'), 'utf8');
  const from = src.indexOf('const SVG_ICON_PATHS = {');
  const dict = src.slice(from, src.indexOf('\n};', from));
  return [...dict.matchAll(/^ {2}'([^']+)':/gm)].map((m) => m[1]);
});

/**
 * 見本に使う実データ。作り物のダミーは置かない——実物を出せば、
 * 部品が本番で何を渡されているかがそのまま見える
 */
hexo.extend.helper.register('ui_gallery_samples', function () {
  const posts = this.site.posts.sort('date', -1).toArray();
  // サムネ・タグ・PV を持つ記事を選ぶ。どれか欠けた記事だと、
  // 見本がその部品を持たない形（空き枠・タグ無し・PV無しの3項目）になる。
  // 直近の記事は GA4 の集計がまだ無いことが多いので、最新から遡って探す
  const post =
    posts.find((p) => p.thumbnail && p.tags && p.tags.length >= 3 && getGA4PV('/' + p.path) > 0) ||
    posts[0];
  return { post, panelPosts: posts.slice(0, 3) };
});
