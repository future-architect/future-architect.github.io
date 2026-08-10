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

  // 2. サイトの全カテゴリを取得し、「合計記事数」で降順にソートする
  const sortedCategoryObjects = this.site.categories.toArray().sort((a, b) => b.length - a.length);
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

hexo.extend.helper.register('category_colors', function() {
  return JSON.stringify(CATEGORY_COLORS);
});

// 指定年の月別 × カテゴリ別の投稿数 (#2171)
hexo.extend.helper.register('get_monthly_category_data', function(year) {
  const byCat = new Map(); // カテゴリ -> 12ヶ月分の配列
  const catTotal = new Map();
  this.site.posts.forEach(post => {
    if (String(post.date.year()) !== String(year)) return;
    const cat = post.categories.first();
    if (!cat) return;
    if (!byCat.has(cat.name)) byCat.set(cat.name, new Array(12).fill(0));
    byCat.get(cat.name)[post.date.month()]++;
    catTotal.set(cat.name, (catTotal.get(cat.name) || 0) + 1);
  });
  const months = [];
  for (let m = 1; m <= 12; m++) months.push(`${m}月`);
  const series = [...catTotal.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => ({name, data: byCat.get(name)}));
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
