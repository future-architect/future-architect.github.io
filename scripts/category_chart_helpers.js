'use strict';

/**
 * サイトの全投稿を集計し、時間軸ごとのカテゴリ別投稿データを生成する
 * - 2018年以前は年ごと、2019年以降は四半期ごと
 * @returns {object} { quarters: string[], series: object[], categories: string[] }
 */
function getQuarterlyCategoryData() {
  const posts = this.site.posts.sort('date', 1); // 日付順にソート
  if (!posts.length) {
    return { quarters: [], series: [], categories: [] };
  }

  const dataByTimeBucket = new Map();

  // 1. 全投稿をループして、時間軸ごとにカテゴリ別投稿数を集計
  posts.forEach(post => {
    const year = post.date.year();
    let timeKey;

    if (year >= 2019) {
      // 2019年以降は四半期ごと
      const quarter = Math.floor(post.date.month() / 3) + 1;
      timeKey = `${year}-Q${quarter}`;
    } else {
      // 2018年以前は年ごと
      timeKey = year.toString();
    }

    if (!dataByTimeBucket.has(timeKey)) {
      dataByTimeBucket.set(timeKey, new Map());
    }

    const bucketData = dataByTimeBucket.get(timeKey);
    const postCategories = post.categories.map(cat => cat.name);
    if (!postCategories.length) return;

    postCategories.forEach(catName => {
      const currentCount = bucketData.get(catName) || 0;
      bucketData.set(catName, currentCount + 1);
    });
  });

  // 2. サイトの全カテゴリを取得し、「合計記事数」で降順にソートする。
  //    同点の決着が無いとビルドごとに並びが変わる
  const sortedCategoryObjects = this.site.categories.toArray().sort((a, b) => b.length - a.length || (a.name < b.name ? -1 : 1));
  const sortedCategoryNames = sortedCategoryObjects.map(cat => cat.name);

  // 3. X軸のラベル（時間軸）を生成し、ソートする
  const sortedTimeKeys = Array.from(dataByTimeBucket.keys()).sort();

  // 4. カテゴリごとの時系列に整形する。チャートの種類（棒・折れ線）や色は
  //    表示側の関心なので、ここでは名前とデータだけを返す
  const series = sortedCategoryObjects.map(category => {
    const catName = category.name;
    const data = sortedTimeKeys.map(timeKey => {
      const bucketData = dataByTimeBucket.get(timeKey);
      return bucketData.get(catName) || 0; // その期間に投稿がなければ0
    });
    return {name: catName, data: data};
  });

  return {
    quarters: sortedTimeKeys, // キー名はEJS側と合わせるため'quarters'のまま
    series: series,
    categories: sortedCategoryNames
  };
}

// ヘルパーとして登録
hexo.extend.helper.register('get_quarterly_category_data', getQuarterlyCategoryData);

// カテゴリの色は名前で固定する (#2170)。系列順に既定パレットを当てると、
// 著者やページごとにカテゴリの並びが違うため、同じ Programming が青だったり
// 緑だったりして色が手がかりにならない。記事数の多いカテゴリから
// 判別しやすい色を割り当てている（ECharts 既定9色 + 旧パレット7色）
const CATEGORY_COLORS = {
  'Programming': '#5470c6',
  'DevOps': '#91cc75',
  'Infrastructure': '#fac858',
  'Frontend': '#ee6666',
  'Culture': '#73c0de',
  'DataScience': '#3ba272',
  'DB': '#fc8452',
  'Mobile': '#9a60b4',
  'IoT': '#ea7ccc',
  'Business': '#c23531',
  'DataEngineering': '#2f4554',
  'Security': '#61a0a8',
  'Management': '#d48265',
  'AIDD': '#749f83',
  '認証認可': '#ca8622',
  'VR': '#bda29a',
};

// 上の対応表に無いカテゴリが増設されたときの予備色。固定16色と被らない色を
// 名前順に決定的に割り当てるので、ページごとに色が変わることはない。
// ただし暫定なので、ビルドログの警告を見たら対応表に追記する
const SPARE_COLORS = ['#6e7074', '#59c4e6', '#edafda', '#93b7e3', '#546570', '#c4ccd3'];

hexo.extend.helper.register('category_colors', function() {
  const colors = Object.assign({}, CATEGORY_COLORS);
  let spare = 0;
  this.site.categories.map(c => c.name).sort().forEach(name => {
    if (!colors[name]) {
      colors[name] = SPARE_COLORS[spare % SPARE_COLORS.length];
      spare++;
      hexo.log.warn(`CATEGORY_COLORS に「${name}」の色がありません。暫定色 ${colors[name]} で描画します。scripts/category_chart_helpers.js に追記してください`);
    }
  });
  return JSON.stringify(colors);
});

// 指定年の月別 × カテゴリ別の投稿数 (#2171)
hexo.extend.helper.register('get_monthly_category_data', function(year) {
  const byCat = new Map(); // カテゴリ -> 12ヶ月分の配列
  this.site.posts.forEach(post => {
    if (String(post.date.year()) !== String(year)) return;
    const cat = post.categories.first();
    if (!cat) return;
    if (!byCat.has(cat.name)) byCat.set(cat.name, new Array(12).fill(0));
    byCat.get(cat.name)[post.date.month()]++;
  });
  const months = [];
  for (let m = 1; m <= 12; m++) months.push(`${m}月`);
  // 並びはその年の多い順ではなく、全期間ページと同じサイト累計の多い順で
  // 固定する。年ごとに入れ替わると、年を移動したとき凡例と積み上げの
  // 色の位置が動いて比較しにくい (#2201)
  const series = this.site.categories.toArray()
    .sort((a, b) => b.length - a.length || (a.name < b.name ? -1 : 1))
    .filter(c => byCat.has(c.name))
    .map(c => ({name: c.name, data: byCat.get(c.name)}));
  return JSON.stringify({months, series});
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
  category.posts.forEach(post => {
    const isRecent = post.date.valueOf() >= oneYearAgo;
    if (isRecent) recent++;
    // 共著の旧記事は author が配列
    [].concat(post.author || []).forEach(a => {
      authors.add(a);
      if (isRecent) recentAuthors.add(a);
    });
    (post.tags ? post.tags.toArray() : []).forEach(tag => {
      tagCount.set(tag.name, (tagCount.get(tag.name) || 0) + 1);
    });
  });
  const topTags = [...tagCount.entries()]
    // インデックスは連載索引の構造タグで、カテゴリの中身を表さない
    .filter(([name]) => name !== 'インデックス')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => {
      const tag = this.site.tags.findOne({name});
      return {name, count, path: tag ? tag.path : `tags/${name}/`};
    });
  return {name: category.name, path: category.path, count: category.length, recent, authorCount: authors.size, recentAuthorCount: recentAuthors.size, topTags};
}

// /categories/ の一覧用データ (#2056)
hexo.extend.helper.register('category_index', function() {
  return this.site.categories.toArray()
    .sort((a, b) => b.length - a.length)
    .map(category => buildCategoryStats.call(this, category));
});

// 絞り込んだ一覧用。カテゴリと同じ統計を、記事の部分集合に対して出す (#2038)
hexo.extend.helper.register('stats_of_posts', function(name, path, posts) {
  return buildCategoryStats.call(this, {name, path, length: posts.length, posts});
});

// カテゴリ個別ページ用。一覧と同じ統計を個別ページにも出す (#2084)
hexo.extend.helper.register('category_stats', function(name) {
  const category = this.site.categories.findOne({name});
  return category ? buildCategoryStats.call(this, category) : null;
});

// 関連カテゴリ (#2200)。独自の採点は持ち込まず、ページに出ている2つの規則の
// 合成で定める: このカテゴリの「よく使われるタグ」（上位5）が、他に
// 「よく使われているカテゴリ」（タグページと同じ 2本以上かつ10%以上）。
// 読者がカテゴリ→タグ→カテゴリとリンクを辿っても同じ結論になる。
// 登壇レポート・初心者向けのような形式タグ経由の関連もあえて除外しない。
// 根拠タグを注記で名乗るので、関連の質は読者が判断できる
hexo.extend.helper.register('related_categories', function(name) {
  const category = this.site.categories.findOne({name});
  if (!category) return [];
  const {topTags} = buildCategoryStats.call(this, category);
  const related = new Map();
  topTags.forEach(t => {
    const tag = this.site.tags.findOne({name: t.name});
    if (!tag) return;
    const total = tag.posts.length;
    const byCat = new Map();
    tag.posts.forEach(post => {
      post.categories.forEach(c => {
        if (c.name === name) return;
        byCat.set(c.name, (byCat.get(c.name) || 0) + 1);
      });
    });
    byCat.forEach((count, catName) => {
      if (count < 2 || count / total < 0.10) return;
      if (!related.has(catName)) {
        const c = this.site.categories.findOne({name: catName});
        related.set(catName, {name: catName, path: c ? c.path : `categories/${catName}/`, tags: [], strength: 0});
      }
      const e = related.get(catName);
      e.tags.push(t.name);
      e.strength += count;
    });
  });
  // 共有タグが多い順。同数なら相手カテゴリ側の本数合計が多い方が関連が濃い。
  // 同点の決着が無いとビルドごとに並びが変わる
  return [...related.values()]
    .sort((a, b) => b.tags.length - a.tags.length || b.strength - a.strength || (a.name < b.name ? -1 : 1))
    .slice(0, 5);
});
