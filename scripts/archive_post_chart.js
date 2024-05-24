'use strict';

hexo.extend.helper.register('max_posts', function(year) {
  let defaultMax = 100;
  if (year) {
    defaultMax = 30;
  }

  const acc = generatePostsSeries(this.site.posts, year);
  return Math.max(defaultMax, Math.max(...acc.map(item => item.count)));
});

hexo.extend.helper.register('generate_posts_series_x', function(year) {
  const acc = generatePostsSeries(this.site.posts, year);
  return acc.map(e => `'${e.groupKey}'`).join(",");
});

hexo.extend.helper.register('generate_posts_series_y', function(year) {
  const acc = generatePostsSeries(this.site.posts, year);
  return acc.map(e => e.count).join(",");
});

hexo.extend.helper.register('ave_posts', function(year) {
  const acc = generatePostsSeries(this.site.posts, year);
  const ave = acc.map(e => e.count).reduce((acc, cur) => {
    return acc + cur;
  }, 0) / acc.length;

  return Math.floor(ave * 10) / 10;
});

const generatePostsSeries = (posts, year) => {
  let target = posts;
  if (year) {
    target = posts.filter(post => post.date.format("YYYY") === year.toString());
  }

  const group = target.reduce((acc, cur) => {
    const month = Number(cur.date.format('MM'));
    let quarterNum;
    if (month <=3) {
      quarterNum = 1;
    } else if (month <= 6) {
      quarterNum = 2;
    } else if (month <= 9) {
      quarterNum = 3;
    } else {
      quarterNum = 4;
    }

    let groupKey;
    if (year) {
      groupKey = cur.date.format("YYYY年MM月")
    } else {
      const quarter = cur.date.format("YYYY") + '年' + quarterNum + 'Q'
      groupKey = quarter
    }

    const item = acc.find(p => p.groupKey === groupKey);
    if (item) {
      item.count++;
    } else {
      acc.push({
        ym: cur.date.format("YYYYMM"),
        groupKey: groupKey,
        count: 1,
      });
    }
    return acc;
  }, []);

  group.sort((a, b) => {
    return a.groupKey.localeCompare(b.groupKey);
  });

  return group;
}
