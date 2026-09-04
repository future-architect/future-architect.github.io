'use strict';

/**
 * テンプレートの共通部品（_partial / _widget）を数え、どこから呼ばれているかと、
 * 部品ギャラリーに見本を出しているかを返す (#2985 / #3045)。
 *
 * 分類は3つ。ギャラリーが呼んでいれば「見本あり」、下の NOT_SHOWN に
 * 理由があれば「見本なし」、**どちらでもなければ「未分類」**。
 * 部品を足したら見本を出すか理由を書くかのどちらかをすることになる。
 *
 * **判定は ui_partials_lint.mjs が回す** (#3205)。以前は /doctor/ に
 * 全部品の台帳として並べていたが、あそこは「対応した方がよさそうなもの」を
 * 出す場所で、答えの決まっている検査は linter に置く（#2706 と同じ線引き）。
 */

const fs = require('fs');
const path = require('path');

const GALLERY = 'gallery.ejs';

// 見本を出さない部品と、その理由。
// 「まだ手を付けていない」は理由にしない——それは未分類として出す
const NOT_SHOWN = {
  'archive-all': '「すべての記事」ページの中身そのもの。ここで一覧をもう1本描かない',
  archive: '一覧ページの本体。ランキング・特集・ページャを含む塊で、部品ではない',
  'article-appendix': '本文末の帯。全幅で敷くので本文列の中に置けない (#2874)',
  article: '記事ページの本体',
  'author-tendencies': '著者ページの本体の一部。page.author に依存する',
  'breadcrumb-page': 'Markdown のページ用にパンくずの項目を組むだけの包み。見た目はパンくずが持つ',
  'chart-xaxis-year-labels': 'echarts に渡す設定値を返す断片。見た目を持たない',
  'chart-yaxis-count': '同上',
  'chart-tooltip-count': '同上（ツールチップ）',
  'edit-pencil': '見出しの末尾に出る、原稿の編集画面への鉛筆。実物がこのページの h1 の末尾にある',
  'echarts-script': 'グラフのライブラリを読み込む <script>。見た目を持たない',
  'featured-post': '呼び出し元が無い',
  'footer-columns': 'フッターの中身。実物がこのページの下端に出ている',
  footer: '同上',
  head: 'ページの <head>。見た目を持たない',
  header: 'ヘッダー。実物がこのページの上端に出ている',
  'json-ld': '構造化データ。見た目を持たない',
  'chart-theme': 'グラフの色をテーマに追従させる <script>。見た目を持たない',
  'sidebar-index-archive': '期間ページのサイドバーそのもの。ページ固有の統計とグラフを持つ',
  'sidebar-index-authors': '同上（/authors/）',
  'sidebar-index-categories': '同上（/categories/）',
  'sidebar-index-tags': '同上（/tags/）',
  'sidebar-index-series': '同上（/series/）',
  'sidebar-index-without': '同上（「◯◯以外の記事」）',
  'sidebar-stats-index':
    '一覧ページのサイドバーの中身。渡された統計とグラフを並べるだけで、単体では形を持たない',
  'post-list-icon': '行に添えるサムネ。記事の行（post-list-item）の見本の中に実物が出ている',
  'post/title':
    '記事の題。一覧のカード（archive-post）の見本の中に実物が出ている。メタ情報の見本には入れない',
  'post/category':
    '同上。カテゴリはパンくずが名乗るので、記事のメタ情報の並びには出てこない (#2837)',
  'related-categories': 'カテゴリページの本体の一部。page.category に依存する',
  'related-tags': 'タグページの本体の一部。page.tag に依存する',
  scripts: 'ページ末のスクリプト。見た目を持たない',
  'search-hint': '検索窓のヒントパネル。実物がこのページの上端にある',
  'site-logo': 'ヘッダーのロゴ。実物がこのページの上端に出ている',
  'theme-toggle':
    '明暗の切り替え。実物がこのページの上端の帯にある。3つの状態のうち出るのは常に1つで、切り替えは CSS が持つ',
  'sidebar-stats': 'サイドバーの中身の一部。page に依存する',
  sidebar: 'サイドバー。実物がこのページの右に出ている',
};

// 参照の書き方は '_partial/svg-icon' / 'svg-icon' / '../category-icon' /
// '_widget/tag.ejs' と揺れるので、すべて同じ名前に寄せる。
// **この行に呼び出しの形をそのまま書かない。** 下の走査が自分自身を読んで、
// 例に挙げた部品の呼び出し元にこのファイルが並ぶ
function normalize(ref) {
  return ref
    .replace(/\.ejs$/, '')
    .replace(/^\.\.\//, '')
    .replace(/^_partial\//, '');
}

function listFiles(dir, ext) {
  const out = [];
  (function walk(d) {
    for (const name of fs.readdirSync(d)) {
      const p = path.join(d, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (name.endsWith(ext)) out.push(p);
    }
  })(dir);
  return out;
}

function buildIndex({ layoutDir, scriptDir }) {
  const files = listFiles(layoutDir, '.ejs');
  const rel = (p) =>
    p
      .replace(layoutDir + path.sep, '')
      .split(path.sep)
      .join('/');

  // 部品 = _partial/ と _widget/ の下の .ejs
  const parts = files.map(rel).filter((f) => f.startsWith('_partial/') || f.startsWith('_widget/'));

  // helper も呼び出し元に数える。呼び出し元が多くて描画が重複するときは
  // helper から this.partial(…) を呼んでよい (#3031) ので、テンプレートだけを
  // 舐めると helper からしか呼ばれない部品が「呼び出し元が無い」に落ちる
  const scripts = listFiles(scriptDir, '.js');
  const scriptRel = (p) =>
    'scripts/' +
    p
      .replace(scriptDir + path.sep, '')
      .split(path.sep)
      .join('/');

  const callers = new Map(); // 部品名 -> 呼び出し元のファイル
  for (const f of files.concat(scripts)) {
    const name = f.startsWith(scriptDir) ? scriptRel(f) : rel(f);
    const text = fs.readFileSync(f, 'utf8');
    for (const m of text.matchAll(/partial\(\s*['"]([^'"]+)['"]/g)) {
      const target = normalize(m[1]);
      if (!callers.has(target)) callers.set(target, new Set());
      callers.get(target).add(name);
    }
  }

  const rows = parts
    .map((file) => {
      const name = normalize(file);
      const from = [...(callers.get(name) || [])].sort();
      const reason = NOT_SHOWN[name] || null;
      return {
        name,
        file,
        // ギャラリー自身は「使われている画面」に数えない
        callers: from.filter((c) => c !== GALLERY),
        // 理由を書いた部品は「見本なし」で確定させる。ギャラリー自身の骨格
        // （パンくず・サイドバー）も partial( ) で呼ぶので、呼ばれたかだけでは
        // 見本と骨格を区別できない
        shown: !reason && from.includes(GALLERY),
        reason,
      };
    })
    .sort((a, b) => b.callers.length - a.callers.length || (a.name < b.name ? -1 : 1));

  return {
    rows,
    shown: rows.filter((r) => r.shown),
    hidden: rows.filter((r) => !r.shown && r.reason),
    unclassified: rows.filter((r) => !r.shown && !r.reason),
    orphan: rows.filter((r) => r.callers.length === 0),
  };
}

module.exports = { buildIndex, NOT_SHOWN, GALLERY };
