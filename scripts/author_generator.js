'use strict';

const pagination = require('hexo-pagination');
const {getSNSCnt, getTwitterCnt, getFacebookCnt, getHatebuCnt, getPocketCnt} = require('./lib/sns');
const moment = require('moment');

hexo.extend.generator.register("author", function(locals) {
    let posts = locals.posts;

    posts.filter(post => Array.isArray(post.author)).forEach(post => {
      post.author.forEach(name => {
        let copy = Object.assign({}, post);
        copy.author = name; // 単著に設定し直し
        posts.data.push(copy);
        posts.length++;
      });
    });

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
   return  pagination('authors', locals.posts.slice(0, 1), {
        layout: ['authors', 'archive', 'index'],
    });
});

function author_to_url(author) {
  return ((this.config.author_generator || {}).url_map || {})[author] || author;
}

hexo.extend.helper.register('list_authors', function(year = 'all') {
  // 年指定、または全期間での投稿数をカウントする関数を定義
  let count_posts = author => this.site.posts.filter(post => post.author === author).length;
  if (year != 'all') {
    count_posts = author => this.site.posts.filter(post => post.date.format("YYYY") === year && post.author === author).length;
  }

  // 投稿数で著者をソート
  const compareFunc = (a, b) => count_posts(b) - count_posts(a);
  const postRankings = this.site.authors.filter(author => !Array.isArray(author)).sort(compareFunc);

  // authorMapperを定義。yearの値によって処理を分岐する
  let authorMapper;

  if (year === 'all') {
    // 全期間表示の場合のロジック
    const currentYear = new Date().getFullYear(); // 今年 (2025)
    const lastYear = currentYear - 1; // 昨年 (2024)
    const twoYearsAgo = currentYear - 2; // 2年前 (2023)

    // 特定の年に著者の投稿があるかチェックするヘルパー
    const hasPostsInYear = (author, checkYear) =>
      this.site.posts.some(post => post.date.year() === checkYear && post.author === author);

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
  if (year === 'all') {
    const coAuthors = this.site.posts.filter(post => Array.isArray(post.author)).map(post => post.author).flat();
    const singleAuthors = this.site.posts.filter(post => !Array.isArray(post.author)).map(post => post.author);
    return coAuthors.concat(singleAuthors).unique().length;
  }

  const coAuthors = this.site.posts.filter(post =>  post.date.format("YYYY") === year && Array.isArray(post.author)).map(post => post.author).flat();
  const singleAuthors = this.site.posts.filter(post =>  post.date.format("YYYY") === year && !Array.isArray(post.author)).map(post => post.author);
  return coAuthors.concat(singleAuthors).unique().length;
});

hexo.extend.helper.register('post_author_link', function(post) {
  const authors = [].concat(post.author || 'Anonymous');
  const link = authors.map(author =>
    `<li><a href="/authors/${encodeURI(author)}" title="${author}さんの記事一覧へ" class="post-author">${author}</a></li>`
  ).join("")
  return `<li class="blog-info-item">${link}</li>`
});

// チャート表示用のデータを生成
hexo.extend.helper.register('generate_post_series', function(author) {
  const acc = generateSeries(this.site.posts, author);
  const postSeries = acc.map(e => e.count).join(",")
  return postSeries;
});

hexo.extend.helper.register('generate_post_month', function(author) {
  const acc = generateSeries(this.site.posts, author);
  const postSeries = acc.map(e => e.yyyyMM).join(",")
  return postSeries;
});

hexo.extend.helper.register('max_post_month', function(author) {
  const acc = generateSeries(this.site.posts, author);
  return Math.max(5, Math.max(...acc.map(item => item.count))); // 最小は5とする
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
hexo.extend.helper.register('max_yearly_authors', function(author) {
  const acc = generateAuthorsSeriesAll(this.site.posts.filter(p => !Array.isArray(p.author)));
  return Math.max(100, Math.max(...acc.map(item => item.authors.unique().length))); // 最小は5とする
});

hexo.extend.helper.register('generate_yearly_authors_series_x', function() {
  const acc = generateAuthorsSeriesAll(this.site.posts.filter(p => !Array.isArray(p.author)));
  const postSeries = acc.map(e => e.year).join(",")
  return postSeries;
});

hexo.extend.helper.register('generate_yearly_authors_series_y', function() {
  const acc = generateAuthorsSeriesAll(this.site.posts.filter(p => !Array.isArray(p.author)));
  const postSeries = acc.map(e => e.authors.unique().length).join(",")
  return postSeries;
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
