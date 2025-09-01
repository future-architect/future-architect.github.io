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

  // 4. EChartsのseries形式にデータを整形
  const series = sortedCategoryObjects.map(category => {
    const catName = category.name;
    const data = sortedTimeKeys.map(timeKey => {
      const bucketData = dataByTimeBucket.get(timeKey);
      return bucketData.get(catName) || 0; // その期間に投稿がなければ0
    });

    return {
      name: catName,
      type: 'line',
      stack: 'Total',
      areaStyle: {},
      emphasis: {
        focus: 'series'
      },
      data: data
    };
  });

  return {
    quarters: sortedTimeKeys, // キー名はEJS側と合わせるため'quarters'のまま
    series: series,
    categories: sortedCategoryNames
  };
}

// ヘルパーとして登録
hexo.extend.helper.register('get_quarterly_category_data', getQuarterlyCategoryData);
