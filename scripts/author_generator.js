'use strict';

const pagination = require('hexo-pagination');
const {getSNSCnt, getTwitterCnt, getFacebookCnt, getHatebuCnt, getPocketCnt} = require('./lib/sns');
const moment = require('moment');

hexo.extend.generator.register("author", function(locals) {
    // author は1記事1名。配列だと著者ページの記事一覧に入らず、集計からも
    // 漏れるが、ビルドは通ってしまうので、ここで止めて気づけるようにする
    const coAuthored = locals.posts.filter(post => Array.isArray(post.author)).toArray();
    if (coAuthored.length) {
      throw new Error(
        'author は1記事1名です。配列になっています:\n  ' +
        coAuthored.map(post => post.source).join('\n  ')
      );
    }

    const posts = locals.posts;
    let authorPosts = posts.map(post => post.author).unique().map(author => ({name:author, posts:posts.find({author})}));

    const generator_config = this.config.author_generator || {};
    const per_page = generator_config.per_page || this.config.per_page || 10;

    return authorPosts.reduce((result, author) => {
      const posts = author.posts.sort('-date');
      const snsCnt = posts.map(post => post.permalink).map(url => getSNSCnt(url)).reduce((acc, cur) => acc + cur);
      const twitterShare = posts.map(post => post.permalink).map(url => getTwitterCnt(url)).reduce((acc, cur) => acc + cur);
      const facebookShare = posts.map(post => post.permalink).map(url => getFacebookCnt(url)).reduce((acc, cur) => acc + cur);
      const hatebu = posts.map(post => post.permalink).map(url => getHatebuCnt(url)).reduce((acc, cur) => acc + cur);
      const pocket = posts.map(post => post.permalink).map(url => getPocketCnt(url)).reduce((acc, cur) => acc + cur);
      const data = pagination('authors/' + author_to_url.call(this, author.name), posts, {
          layout: ['author', 'archive', 'index'],
          perPage: per_page,
          data: {
              author: author.name,
              authorSNSCnt: snsCnt,
              twitterShare: twitterShare,
              facebookShare: facebookShare,
              hatebu: hatebu,
              pocket: pocket
          }
      });
      return result.concat(data);
    }, []);
});

// Author Root Page
hexo.extend.generator.register("authors", function(locals) {
   // ページ生成に1件必要なだけのダミー。並べてから取らないと OGP 画像が実行ごとに変わる
   return  pagination('authors', locals.posts.sort('-date').slice(0, 1), {
        layout: ['authors', 'archive', 'index'],
    });
});

function author_to_url(author) {
  return ((this.config.author_generator || {}).url_map || {})[author] || author;
}

hexo.extend.helper.register('list_authors', function(year = 'all') {
  // 著者ごとの件数と活動年を、先に記事1周で数え切る。
  // 以前は sort の比較関数の中で毎回全記事を filter しており、
  // 著者数 × 比較回数 × 記事数で /authors/ のレンダリングに数十秒かかっていた。
  // 共著（author が配列）を数えないのは従来の === 比較と同じ挙動
  const countByAuthor = new Map();
  const yearsByAuthor = new Map();
  this.site.posts.forEach(post => {
    const a = post.author;
    const y = post.date.year();
    if (year === 'all' || String(y) === year) {
      countByAuthor.set(a, (countByAuthor.get(a) || 0) + 1);
    }
    if (!yearsByAuthor.has(a)) yearsByAuthor.set(a, new Set());
    yearsByAuthor.get(a).add(y);
  });
  const count_posts = author => countByAuthor.get(author) || 0;

  // 投稿数の降順。同数は名前で決める（決着が無いとビルドごとに並びが変わる）。
  // localeCompare を使わないのは環境の ICU/ロケールに左右させないため
  const compareFunc = (a, b) =>
    count_posts(b) - count_posts(a) || (a < b ? -1 : a > b ? 1 : 0);
  const postRankings = this.site.authors.slice().sort(compareFunc);

  // authorMapperを定義。yearの値によって処理を分岐する
  let authorMapper;

  if (year === 'all') {
    // 全期間表示の場合のロジック
    const currentYear = new Date().getFullYear(); // 今年 (2025)
    const lastYear = currentYear - 1; // 昨年 (2024)
    const twoYearsAgo = currentYear - 2; // 2年前 (2023)

    // 特定の年に著者の投稿があるかチェックするヘルパー
    const hasPostsInYear = (author, checkYear) => {
      const years = yearsByAuthor.get(author);
      return years ? years.has(checkYear) : false;
    };

    authorMapper = author => {
      let suffix = '';
      const hasNoPostsThisYear = !hasPostsInYear(author, currentYear);

      // 今年の投稿実績がない著者のみを対象にサフィックスを判定
      if (hasNoPostsThisYear) {
        // 条件(拡張): 昨年実績があるか -> '**'を付与
        if (hasPostsInYear(author, lastYear)) {
          suffix = '**';
        // 条件: 2年前に実績があるか -> '*'を付与
        } else if (hasPostsInYear(author, twoYearsAgo)) {
          suffix = '*';
        }
      }

      return `
        <li class="author-list-item">
          <a class="author-list-link" href="/authors/${author_to_url.call(this, author)}">${author}${suffix}</a>
          <span class="author-list-count">${count_posts(author)} 件</span>
        </li>`;
    };
  } else {
    // 年指定の場合のロジック (従来通り)
    authorMapper = author => `
      <li class="author-list-item">
        <a class="author-list-link" href="/authors/${author_to_url.call(this, author)}">${author}</a>
        <span class="author-list-count">${count_posts(author)} 件</span>
      </li>`;
  }

  const authors = postRankings.filter(author => count_posts(author) > 0).map(authorMapper).join('');

  return `<ul class="author-list">${authors}</ul>`;
});

// 全著者数を表示
hexo.extend.helper.register('count_authors', function(year='all') {
  const posts = year === 'all'
    ? this.site.posts
    : this.site.posts.filter(post => post.date.format("YYYY") === year);
  return posts.map(post => post.author).unique().length;
});

// 著者ページの傾向表示用 (#2082)。よく投稿するカテゴリ（上位3）と
// よく使うタグ（上位10）、直近1年の投稿数を返す
hexo.extend.helper.register('author_stats', function(name) {
  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const posts = this.site.posts.filter(post => [].concat(post.author || []).includes(name));
  const catCount = new Map();
  const tagCount = new Map();
  let recent = 0;
  posts.forEach(post => {
    if (post.date.valueOf() >= oneYearAgo) recent++;
    (post.categories ? post.categories.toArray() : []).forEach(c => {
      const e = catCount.get(c.name) || {name: c.name, path: c.path, count: 0};
      e.count++;
      catCount.set(c.name, e);
    });
    (post.tags ? post.tags.toArray() : []).forEach(t => {
      const e = tagCount.get(t.name) || {name: t.name, path: t.path, count: 0};
      e.count++;
      tagCount.set(t.name, e);
    });
  });
  const byCount = (a, b) => b.count - a.count;
  return {
    recent,
    topCategories: [...catCount.values()].sort(byCount).slice(0, 3),
    // インデックスは連載索引の構造タグで、執筆傾向を表さない
    topTags: [...tagCount.values()].filter(t => t.name !== 'インデックス').sort(byCount).slice(0, 10),
  };
});

hexo.extend.helper.register('post_author_link', function(post) {
  const author = post.author || 'Anonymous';
  // li の直下に li を入れるとパーサが外側の li を閉じてしまい、
  // 著者だけ blog-info-item を持たない li に分割されて間隔が崩れる (#2049)
  const link = `<a href="/authors/${encodeURI(author)}" title="${author}さんの記事一覧へ" class="post-author">${author}</a>`;
  return `<li class="blog-info-item">${link}</li>`
});

// チャート表示用のデータを生成
hexo.extend.helper.register('generate_post_series', function(author) {
  return generateSeries(this.site.posts, author).map(e => e.count).join(',');
});

hexo.extend.helper.register('generate_post_month', function(author) {
  return generateSeries(this.site.posts, author).map(e => e.yyyyMM).join(',');
});

hexo.extend.helper.register('max_post_month', function(author) {
  return Math.max(5, ...generateSeries(this.site.posts, author).map(e => e.count)); // 最小は5
});

const generateSeries = (posts, author) => {
  const target = posts.filter(post => post.author === author);
  const start = moment.min(...target.map(item => item.date)).clone(); // Add操作で副作用があるのでclone
  const end = moment.max(...target.map(item => item.date));

  let fillingItems = [];
  for (;;) {
    const date = start.add(1, 'M')
    fillingItems.push({
      yyyyMM: date.format("YYYYMM"),
      count:0
    })
    if (date.format("YYYYMM") === end.format("YYYYMM") || date >= end) {
      break;
    }
  }

  const group = target.reduce((acc, cur) => {
    const item = acc.find(p => p.yyyyMM === cur.date.format("YYYYMM"));
    if (item) {
      item.count++;
    } else {
      acc.push({
        yyyyMM: cur.date.format("YYYYMM"),
        count: 1
      });
    }
    return acc;
  }, []);

  const merge = group.concat(fillingItems).reduce((acc, cur) => {
    const item = acc.find(p => p.yyyyMM === cur.yyyyMM);
    if (item) {
      item.count += cur.count;
    } else {
      acc.push(cur);
    }
    return acc;
  }, []);

  merge.sort((a, b) => {
    return a.yyyyMM.localeCompare(b.yyyyMM);
  });

  return merge;
}


/*
 * 著者一覧ページ
 */
hexo.extend.helper.register('generate_yearly_authors_series_x', function() {
  return generateAuthorsSeriesAll(this.site.posts).map(e => e.year).join(',');
});

hexo.extend.helper.register('generate_yearly_authors_series_y', function() {
  return generateAuthorsSeriesAll(this.site.posts).map(e => e.authors.unique().length).join(',');
});

// 新規寄稿者の割合（%）。「新規」は前年に投稿が無かった寄稿者（#2073）。
// 初出ベースではないので、数年ぶりに復帰した人も新規に数える。
// 最初の年は前年が無く全員新規（100%）になるだけなので欠損にする
hexo.extend.helper.register('yearly_new_author_ratio', function() {
  const series = generateAuthorsSeriesAll(this.site.posts);
  // 共著の旧記事は author が配列なので flat で展開する
  const sets = series.map(e => new Set(e.authors.flat()));
  return series.map((e, i) => {
    if (i === 0 || sets[i].size === 0) return "'-'";
    const newcomers = [...sets[i]].filter(a => !sets[i - 1].has(a)).length;
    return Math.round(newcomers * 100 / sets[i].size);
  }).join(',');
});

const generateAuthorsSeriesAll = posts => {
  const group = posts.reduce((acc, cur) => {
    const item = acc.find(p => p.year === cur.date.format("YYYY"));
    if (item) {
      item.authors.push(cur.author);
    } else {
      acc.push({
        year: cur.date.format("YYYY"),
        authors: [cur.author],
      });
    }
    return acc;
  }, []);

  group.sort((a, b) => {
    return a.year.localeCompare(b.year);
  });

  return group;
}
