'use strict';

const { getGA4PV } = require('./lib/ga4');

// カテゴリの色は名前で固定する (#2170)。系列順に既定パレットを当てると、
// 著者やページごとにカテゴリの並びが違うため、同じ Programming が青だったり
// 緑だったりして色が手がかりにならない。記事数の多いカテゴリから
// 判別しやすい色を割り当てている（ECharts 既定9色 + 旧パレット7色）
const CATEGORY_COLORS = {
  Programming: '#5470c6',
  DevOps: '#91cc75',
  Infrastructure: '#fac858',
  // Infrastructure から分かれたので、隣り合っても混ざらない色にする (#2461)。
  // Culture の淡い水色 #73c0de より濃く倒して区別する
  Cloud: '#2f9fd0',
  Frontend: '#ee6666',
  Culture: '#73c0de',
  DataScience: '#3ba272',
  DB: '#fc8452',
  Mobile: '#9a60b4',
  IoT: '#ea7ccc',
  Business: '#c23531',
  DataEngineering: '#2f4554',
  Security: '#61a0a8',
  Management: '#d48265',
  AIDD: '#749f83',
  認証認可: '#ca8622',
  VR: '#bda29a',
  // Terraform のブランド色。Mobile の紫よりも濃く倒して判別する
  IaC: '#7b42bc',
};

// 上の対応表に無いカテゴリが増設されたときの予備色。固定16色と被らない色を
// 名前順に決定的に割り当てるので、ページごとに色が変わることはない。
// ただし暫定なので、ビルドログの警告を見たら対応表に追記する
const SPARE_COLORS = ['#6e7074', '#59c4e6', '#edafda', '#93b7e3', '#546570', '#c4ccd3'];

hexo.extend.helper.register('category_colors', function () {
  const colors = Object.assign({}, CATEGORY_COLORS);
  let spare = 0;
  this.site.categories
    .map((c) => c.name)
    .sort()
    .forEach((name) => {
      if (!colors[name]) {
        colors[name] = SPARE_COLORS[spare % SPARE_COLORS.length];
        spare++;
        hexo.log.warn(
          `CATEGORY_COLORS に「${name}」の色がありません。暫定色 ${colors[name]} で描画します。scripts/category_chart_helpers.js に追記してください`,
        );
      }
    });
  return JSON.stringify(colors);
});

// 月別 × カテゴリ別の投稿数 (#2171)。year を渡すとその年、省略すると全期間。
//
// 全期間も月で刻む (#2432)。以前は四半期（しかも2018年以前だけ年）だったが、
// 同じ全期間を個別ページ（カテゴリ・タグ・著者）は月で描いており、粒度が
// ページによって違っていた。読み手が知りたいのは「どれくらいのペースで
// 書かれているか」で、それは月の単位で見るもの。粒度はページの種類ではなく
// 読み取る問いで決める
hexo.extend.helper.register('get_monthly_category_data', function (year) {
  const now = new Date();
  const nowY = now.getFullYear();
  const nowM = now.getMonth() + 1;

  // 軸の作り方。年を指定したときは 1月〜（今年なら現在月まで）。
  // 今年で12ヶ月固定にすると未来の空欄が並ぶうえ、同じページの「週別」タブ
  // （posts_stack_series）と軸の長さが食い違い、タブを切り替えるたびに
  // 棒の幅と位置が変わっていた (#2430)
  //
  // 全期間は最初の投稿の月から現在月まで。ラベルは YYYY/MM で、
  // 個別ページ（category.ejs / author.ejs）と同じ書式にそろえる
  let months;
  let indexOf;
  if (year) {
    const monthCount = Number(year) === nowY ? nowM : 12;
    months = Array.from({ length: monthCount }, (_, i) => `${i + 1}月`);
    indexOf = (post) =>
      String(post.date.year()) === String(year) && post.date.month() < monthCount
        ? post.date.month()
        : -1;
  } else {
    const first = this.site.posts.sort('date', 1).first();
    if (!first) return JSON.stringify({ months: [], series: [] });
    const startY = first.date.year();
    const startM = first.date.month() + 1; // moment の month() は 0 始まり
    months = [];
    for (let y = startY; y <= nowY; y++) {
      for (let m = y === startY ? startM : 1; m <= (y === nowY ? nowM : 12); m++) {
        months.push(`${y}/${String(m).padStart(2, '0')}`);
      }
    }
    indexOf = (post) => (post.date.year() - startY) * 12 + (post.date.month() + 1) - startM;
  }

  const byCat = new Map(); // カテゴリ -> 月ごとの配列
  this.site.posts.forEach((post) => {
    const i = indexOf(post);
    if (i < 0 || i >= months.length) return;
    const cat = post.categories.first();
    if (!cat) return;
    if (!byCat.has(cat.name)) byCat.set(cat.name, new Array(months.length).fill(0));
    byCat.get(cat.name)[i]++;
  });
  // 並びはその年の多い順ではなく、全期間ページと同じサイト累計の多い順で
  // 固定する。年ごとに入れ替わると、年を移動したとき凡例と積み上げの
  // 色の位置が動いて比較しにくい (#2201)
  const series = orderedCategories(this.site)
    .filter((c) => byCat.has(c.name))
    .map((c) => ({ name: c.name, data: byCat.get(c.name) }));
  return JSON.stringify({ months, series });
});

// 月ページの週別 × カテゴリ別の投稿数 (#2227)。週は「その月の何日目か」で
// 決める（1〜7日 = 第1週）。posts_stack_series と同じ規則で、ISO週だと
// 月をまたぐ週が出て合計が月の投稿数と合わなくなる
hexo.extend.helper.register('get_weekly_category_data', function (year, month) {
  const ym = year.toString() + month.toString().padStart(2, '0');
  const daysInMonth = new Date(Number(year), Number(month), 0).getDate();
  const weekCount = Math.ceil(daysInMonth / 7);
  const byCat = new Map();
  this.site.posts.forEach((post) => {
    if (post.date.format('YYYYMM') !== ym) return;
    const cat = post.categories.first();
    if (!cat) return;
    if (!byCat.has(cat.name)) byCat.set(cat.name, new Array(weekCount).fill(0));
    const w = Math.min(weekCount, Math.ceil(Number(post.date.format('D')) / 7)) - 1;
    byCat.get(cat.name)[w]++;
  });
  const weeks = Array.from({ length: weekCount }, (_, i) => `第${i + 1}週`);
  // 並びは年ページと同じサイト累計の多い順で固定 (#2201)
  const series = orderedCategories(this.site)
    .filter((c) => byCat.has(c.name))
    .map((c) => ({ name: c.name, data: byCat.get(c.name) }));
  return JSON.stringify({ weeks, series });
});

// カテゴリの並びはサイト全体で1つ (#2959)。累計の多い順で、同点は
// **より新しい記事を出した方を上**にする。同点のカテゴリは次に記事が出た側の
// 累計が先に進むので、そのとき順位が入れ替わる向きに最初から並べておく。
// 最後に名前で決めるのは、最新記事の時刻まで同じだったときの保険
// （同日複数投稿は date を秒でずらす規約があるので実際には起きない）。
//
// 同点は3組ある: DevOps / Frontend（134）、DB / Infrastructure（70）、
// IaC / Mobile（57）。決着が無いと toArray() の順序次第でビルドごとに
// 入れ替わっていた (#2959)。
//
// 記事数を鍵にして持ち回る。18カテゴリ×所属記事を毎ページ4回舐めると
// その分ビルドが伸びる（呼ぶのはヘッダー・サイドバー・ポータル・グラフ）。
// 記事数が変わったら作り直すので server での編集にも追随する
const categoryOrderCache = new Map();

function latestPostTime(category) {
  let latest = 0;
  category.posts.forEach((post) => {
    const t = post.date.valueOf();
    if (t > latest) latest = t;
  });
  return latest;
}

function orderedCategories(site) {
  const key = String(site.posts.length);
  if (categoryOrderCache.has(key)) return categoryOrderCache.get(key);
  const latest = new Map();
  const cats = site.categories.toArray();
  cats.forEach((c) => latest.set(c.name, latestPostTime(c)));
  const sorted = cats.sort(
    (a, b) =>
      b.length - a.length || latest.get(b.name) - latest.get(a.name) || (a.name < b.name ? -1 : 1),
  );
  categoryOrderCache.set(key, sorted);
  return sorted;
}

// カテゴリを群に束ねる (#2908)。所属と群の並びは source/_data/category_groups.yml が
// 持ち、群の中の並びはここで決める（orderedCategories と同じ累計の多い順）。
// 読者が見る3箇所——ヘッダーのドロップダウン・サイドバー・/categories/——で
// 同じ群・同じ並びになる。
//
// 群の並びだけ本数から出さないのは、5つの群が読者にとって対等ではないため。
// 大きい順に並べても意味は増えず、並べ替えの理由がファイルの外に出てしまう。
//
// 群に属さないカテゴリは黙って消さずに「その他」へ出す。カテゴリは
// 記事への行き先なので、登録漏れで navigation から消える方が害が大きい。
// 色の対応表（CATEGORY_COLORS）と同じく、ビルドログの警告で気づく形にする
const UNGROUPED = 'その他';

// 直近1年の本数。ドロップダウンの title が「累計と直近1年」の対を出すのに使う。
// orderedCategories と同じく記事数を鍵にして持ち回る（全カテゴリの所属記事を
// 毎ページ舐めるとビルドが伸びる）
const recentCountCache = new Map();

function recentCounts(site) {
  const key = String(site.posts.length);
  if (recentCountCache.has(key)) return recentCountCache.get(key);
  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const counts = new Map();
  site.categories.forEach((category) => {
    let recent = 0;
    category.posts.forEach((post) => {
      if (post.date.valueOf() >= oneYearAgo) recent++;
    });
    counts.set(category.name, recent);
  });
  recentCountCache.set(key, counts);
  return counts;
}

function groupedCategories(site) {
  const membership = (site.data && site.data.category_groups) || {};
  const groupOf = new Map();
  Object.keys(membership).forEach((group) => {
    (membership[group] || []).forEach((name) => groupOf.set(name, group));
  });
  const members = new Map(Object.keys(membership).map((group) => [group, []]));
  const recent = recentCounts(site);
  orderedCategories(site).forEach((category) => {
    let group = groupOf.get(category.name);
    if (!group) {
      group = UNGROUPED;
      hexo.log.warn(
        `source/_data/category_groups.yml に「${category.name}」の群がありません。「${UNGROUPED}」として描画します`,
      );
      if (!members.has(group)) members.set(group, []);
    }
    members.get(group).push({
      name: category.name,
      path: category.path,
      count: category.length,
      recent: recent.get(category.name) || 0,
    });
  });
  // Map は挿入順を保つので、yml のキーの順がそのまま群の並びになる
  // （「その他」は登録漏れのときだけ末尾に足される）
  return [...members.entries()]
    .filter(([, categories]) => categories.length)
    .map(([name, categories]) => ({ name, categories }));
}

// ヘッダーのドロップダウン (#2877) から呼ぶ。全18件を出す。
// 並びを1箇所に保つため、テンプレート側で sort し直さない
hexo.extend.helper.register('category_groups', function () {
  return groupedCategories(this.site);
});

// サイドバー（_widget/category.ejs）から呼ぶ。**上限8件**に絞る。
// 全件はヘッダーのドロップダウンが持つ。
//
// **8件は空間から決めた上限で、本数の分布の切れ目とは関係が無い。** 切れ目で
// 決めると、分布が変わるたびに上限の根拠がこのファイルの外へ出てしまう。
// 条件は「枠が3つあることが1画面で分かる」こと。サイドバーが出るいちばん
// 小さい画面（1366×768、viewport 約640px）で、枠の開始 y=118 から次の枠
// 「人気の連載」の見出しの下端までが 640px に入るには枠が 459px 以下で、
// 群ラベル4本の固定費155px と見出し33px を引くと8行（30.2px×8＝242px）。
// 実測 430px で 29px の余裕がある。
// 走査コスト（群の数＋最大群サイズ）も 5+4=9 から 4+3=7 に落ちる
const SIDEBAR_LIMIT = 8;

// 物差しは直近1年に公開された記事の PV 合計。「人気の」が付く枠は
// 人気の連載・人気のタグと同じ鍵で選ぶ (#2855)。
// 直近3本未満を外すのも同じ理由で、単発のバズを勢いと取り違えないため
const SIDEBAR_MIN_RECENT = 3;

// 直近1年の PV 合計。記事数を鍵にして持ち回るのは recentCounts と同じ理由
const recentPvCache = new Map();

function recentPv(site) {
  const key = String(site.posts.length);
  if (recentPvCache.has(key)) return recentPvCache.get(key);
  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const pv = new Map();
  site.categories.forEach((category) => {
    let sum = 0;
    category.posts.forEach((post) => {
      if (post.date.valueOf() >= oneYearAgo) sum += getGA4PV('/' + post.path);
    });
    pv.set(category.name, sum);
  });
  recentPvCache.set(key, pv);
  return pv;
}

hexo.extend.helper.register('popular_category_groups', function (current) {
  const pv = recentPv(this.site);
  const groups = groupedCategories(this.site);
  const shown = new Set(
    groups
      .flatMap((g) => g.categories)
      .filter((c) => c.recent >= SIDEBAR_MIN_RECENT && pv.get(c.name) > 0)
      // **同点は PV の次に直近1年の本数で決める。** GA4 の値は 100 単位に
      // 丸められている（全1,499件が100の倍数）ので同点が構造的に出て、候補が
      // 17件しか無いここでは上限の線にちょうど並ぶ（Business と Culture が
      // 10,000PV）。名前順で決めると、落ちる理由が読者から見て何も無くなる
      .sort(
        (a, b) =>
          pv.get(b.name) - pv.get(a.name) ||
          b.recent - a.recent ||
          b.count - a.count ||
          (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
      )
      .slice(0, SIDEBAR_LIMIT)
      .map((c) => c.name),
  );
  // **いま見ているカテゴリは順位に関わらず残す。** 現在地が一覧から消えると、
  // そのカテゴリのページに来た読者が自分の居場所を見失う
  return groups
    .map((group) => ({
      name: group.name,
      categories: group.categories.filter((c) => shown.has(c.name) || c.name === current),
    }))
    .filter((group) => group.categories.length);
});

/**
 * カテゴリ1つ分の統計。件数・寄稿者数（累計・直近1年）と
 * よく使われるタグ（上位5個）を返す。
 * カテゴリ名は広い言葉なので、代表タグを添えて中身の見当を付けられるようにする
 */
function buildCategoryStats(category) {
  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const tagCount = new Map();
  const authors = new Set();
  const recentAuthors = new Set();
  let recent = 0;
  category.posts.forEach((post) => {
    const isRecent = post.date.valueOf() >= oneYearAgo;
    if (isRecent) recent++;
    // 共著の旧記事は author が配列
    [].concat(post.author || []).forEach((a) => {
      authors.add(a);
      if (isRecent) recentAuthors.add(a);
    });
    (post.tags ? post.tags.toArray() : []).forEach((tag) => {
      tagCount.set(tag.name, (tagCount.get(tag.name) || 0) + 1);
    });
  });
  const topTags = [...tagCount.entries()]
    // インデックスは連載索引の構造タグで、カテゴリの中身を表さない
    .filter(([name]) => name !== 'インデックス')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => {
      const tag = this.site.tags.findOne({ name });
      return { name, count, path: tag ? tag.path : `tags/${name}/` };
    });
  return {
    name: category.name,
    path: category.path,
    count: category.length,
    recent,
    authorCount: authors.size,
    recentAuthorCount: recentAuthors.size,
    topTags,
  };
}

// /categories/ の一覧用データ (#2056)。群ごとに、カテゴリ1件ずつの統計を返す (#2908)。
// 群と並びは groupedCategories が1箇所で持つ
hexo.extend.helper.register('category_group_index', function () {
  return groupedCategories(this.site).map((group) => ({
    name: group.name,
    categories: group.categories.map((c) =>
      buildCategoryStats.call(this, this.site.categories.findOne({ name: c.name })),
    ),
  }));
});

// 絞り込んだ一覧用。カテゴリと同じ統計を、記事の部分集合に対して出す (#2038)
hexo.extend.helper.register('stats_of_posts', function (name, path, posts) {
  return buildCategoryStats.call(this, { name, path, length: posts.length, posts });
});

// カテゴリ個別ページ用。一覧と同じ統計を個別ページにも出す (#2084)
hexo.extend.helper.register('category_stats', function (name) {
  const category = this.site.categories.findOne({ name });
  return category ? buildCategoryStats.call(this, category) : null;
});

/**
 * 記事の集合を月ごとに均し、echarts の x 軸（months）と月別の内訳を返す。
 * カテゴリページとタグページで共用する。
 *
 * 開始は初投稿年の1月に揃える（数ヶ月しか無い対象の軸が中途半端な月から
 * 始まらないように #2140）。終了は現在月。最終投稿年の12月までにすると、
 * 今も書かれている対象では未来の空欄が並び、書かれなくなった対象では
 * 「いつから止まっているか」が軸から消える。
 * 予約投稿（_config.yml の future: true）で未来日付の記事があるときは、
 * その月まで伸ばして棒が切れないようにする。
 */
function monthlyBuckets(posts) {
  const byMonth = new Map(); // "YYYY/MM" -> Map(カテゴリ -> 本数)
  let min = null;
  let max = null;
  posts.forEach((post) => {
    const ym = post.date.format('YYYY/MM');
    if (!min || ym < min) min = ym;
    if (!max || ym > max) max = ym;
    // カテゴリは第1のものだけ数える。複数カテゴリを全部積むと
    // 合計が投稿数と合わなくなる（著者ページのチャートと同じ規則）
    const cat = post.categories && post.categories.length ? post.categories.first().name : '未分類';
    if (!byMonth.has(ym)) byMonth.set(ym, new Map());
    const m = byMonth.get(ym);
    m.set(cat, (m.get(cat) || 0) + 1);
  });
  if (!min) return null;

  const now = new Date();
  const nowYm = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
  const endYm = max > nowYm ? max : nowYm;
  const months = [];
  for (let y = +min.slice(0, 4); y <= +endYm.slice(0, 4); y++) {
    for (let m = 1; m <= 12; m++) {
      const ym = `${y}/${String(m).padStart(2, '0')}`;
      if (ym > endYm) break;
      months.push(ym);
    }
  }
  return { byMonth, months };
}

/** 積む順（＝凡例の順）はサイト累計の多い順で固定する (#2201) */
function siteCategoryOrder() {
  return orderedCategories(this.site).map((c) => c.name);
}

/**
 * カテゴリページの月別投稿数 (#2423)。刻み・描画とも著者ページ・タグページと
 * 揃えて echarts の月別チャートにする。
 *
 * カテゴリページでは内訳の軸が無い（全部そのカテゴリ）ので、系列は1本。
 * 色は /categories/ の積み上げ棒と同じ、そのカテゴリの色で塗る。
 */
hexo.extend.helper.register('category_monthly_chart', function (name) {
  const category = this.site.categories.findOne({ name });
  if (!category) return null;
  const buckets = monthlyBuckets(category.posts.toArray());
  if (!buckets) return null;
  const { byMonth, months } = buckets;
  const series = [
    {
      name,
      type: 'bar',
      data: months.map((ym) => {
        const m = byMonth.get(ym);
        return m ? [...m.values()].reduce((a, b) => a + b, 0) : 0;
      }),
    },
  ];
  return JSON.stringify({ months, series });
});

/**
 * タグページの月別投稿数 (#2434)。刻み・描画とも著者ページと同じにする。
 *
 * CSS で描いていたが echarts に戻した。ツールチップの即時表示と凡例での
 * 絞り込みが無いぶん、CSS 版は読み手の使い勝手が落ちていた。グラフは
 * echarts に統一する。
 *
 * ただしタグは数が桁違い（約700）で、1〜4本のタグが半分以上を占める。
 * 棒が数本立つだけのグラフは「いつ書かれたか」を示すが、それは直下の
 * 記事一覧の日付と同じ情報でしかない。5本以上あり、かつ投稿のある月が
 * 2つ以上（＝時間の中で動きがある）タグにだけ出す。
 *
 * 積み上げはカテゴリ別。タグは複数のカテゴリにまたがるので、
 * 「このタグがどの分野で書かれてきたか」「その構成が時期で変わったか」まで
 * 読める。色は他ページと同じくカテゴリ名で固定 (#2170)、積む順と凡例の順は
 * サイト累計の多い順で固定する (#2201)。
 */
const TAG_CHART_MIN_POSTS = 5;
const TAG_CHART_MIN_MONTHS = 2;

hexo.extend.helper.register('tag_monthly_chart', function (name) {
  const tag = this.site.tags.findOne({ name });
  if (!tag || tag.length < TAG_CHART_MIN_POSTS) return null;
  const buckets = monthlyBuckets(tag.posts.toArray());
  if (!buckets || buckets.byMonth.size < TAG_CHART_MIN_MONTHS) return null;
  const { byMonth, months } = buckets;

  const series = siteCategoryOrder
    .call(this)
    .filter((cat) => [...byMonth.values()].some((m) => m.has(cat)))
    .map((cat) => ({
      name: cat,
      type: 'bar',
      stack: 'total',
      data: months.map((ym) => (byMonth.get(ym) && byMonth.get(ym).get(cat)) || 0),
    }));
  return JSON.stringify({ months, series });
});

// 関連カテゴリ (#2200)。独自の採点は持ち込まず、ページに出ている2つの規則の
// 合成で定める: このカテゴリの「よく使われるタグ」（上位5）が、他に
// 「よく使われているカテゴリ」（タグページと同じ 2本以上かつ10%以上）。
// 読者がカテゴリ→タグ→カテゴリとリンクを辿っても同じ結論になる。
// 登壇レポート・初心者向けのような形式タグ経由の関連もあえて除外しない。
// 根拠タグを注記で名乗るので、関連の質は読者が判断できる
hexo.extend.helper.register('related_categories', function (name) {
  const category = this.site.categories.findOne({ name });
  if (!category) return [];
  const { topTags } = buildCategoryStats.call(this, category);
  const related = new Map();
  topTags.forEach((t) => {
    const tag = this.site.tags.findOne({ name: t.name });
    if (!tag) return;
    const total = tag.posts.length;
    const byCat = new Map();
    tag.posts.forEach((post) => {
      post.categories.forEach((c) => {
        if (c.name === name) return;
        byCat.set(c.name, (byCat.get(c.name) || 0) + 1);
      });
    });
    byCat.forEach((count, catName) => {
      if (count < 2 || count / total < 0.1) return;
      if (!related.has(catName)) {
        const c = this.site.categories.findOne({ name: catName });
        related.set(catName, {
          name: catName,
          path: c ? c.path : `categories/${catName}/`,
          tags: [],
          strength: 0,
        });
      }
      const e = related.get(catName);
      e.tags.push(t.name);
      e.strength += count;
    });
  });
  // 共有タグが多い順。同数なら相手カテゴリ側の本数合計が多い方が関連が濃い。
  // 同点の決着が無いとビルドごとに並びが変わる
  return [...related.values()]
    .sort(
      (a, b) =>
        b.tags.length - a.tags.length || b.strength - a.strength || (a.name < b.name ? -1 : 1),
    )
    .slice(0, 5);
});
