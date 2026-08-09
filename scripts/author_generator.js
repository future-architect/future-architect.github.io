'use strict';

const pagination = require('hexo-pagination');
const {getSNSCnt, getTwitterCnt, getFacebookCnt, getHatebuCnt, getPocketCnt} = require('./lib/sns');

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
  // 使用が1本だけの項目は「よく使う」傾向とは言えないので省く (#2139)。
  // ただし省いた結果が空になる著者（投稿1本や、投稿ごとにタグが全部違う著者）は
  // 何も出せなくなるので、その場合だけ省かずに全部見せる
  const pickTop = (entries, limit) => {
    const sorted = entries.sort(byCount);
    const repeated = sorted.filter(e => e.count >= 2);
    return (repeated.length > 0 ? repeated : sorted).slice(0, limit);
  };
  return {
    recent,
    topCategories: pickTop([...catCount.values()], 3),
    // インデックスは連載索引の構造タグで、執筆傾向を表さない
    topTags: pickTop([...tagCount.values()].filter(t => t.name !== 'インデックス'), 10),
  };
});

hexo.extend.helper.register('post_author_link', function(post) {
  const author = post.author || 'Anonymous';
  // li の直下に li を入れるとパーサが外側の li を閉じてしまい、
  // 著者だけ blog-info-item を持たない li に分割されて間隔が崩れる (#2049)
  const link = `<a href="/authors/${encodeURI(author)}" title="${author}さんの記事一覧へ" class="post-author">${author}</a>`;
  return `<li class="blog-info-item">${link}</li>`
});

// 著者ページの月別投稿数チャート用データ (#2135 / #2138 / #2140)。
// カテゴリごとの積み上げにするため {months, series} を JSON で返す
hexo.extend.helper.register('author_monthly_chart', function(name) {
  const posts = this.site.posts.filter(post => [].concat(post.author || []).includes(name));
  // month(YYYY/MM) -> category -> count
  const byMonth = new Map();
  const catTotal = new Map();
  let min = null;
  let max = null;
  posts.forEach(post => {
    const ym = post.date.format('YYYY/MM');
    if (!min || ym < min) min = ym;
    if (!max || ym > max) max = ym;
    // カテゴリは第1のものだけ数える。複数カテゴリを全部積むと
    // 合計が投稿数と合わなくなる
    const cat = post.categories && post.categories.length ? post.categories.first().name : '未分類';
    catTotal.set(cat, (catTotal.get(cat) || 0) + 1);
    if (!byMonth.has(ym)) byMonth.set(ym, new Map());
    const m = byMonth.get(ym);
    m.set(cat, (m.get(cat) || 0) + 1);
  });
  if (!min) return JSON.stringify({months: [], series: []});

  // 軸は暦年に揃える。開始は初投稿年の1月、終了は最終投稿年の12月 (#2140)。
  // 投稿月そのままだと数ヶ月分しか無い著者の軸が中途半端な月で
  // 始まり・止まりして見栄えが悪い。全著者を同じ規則にする
  const startY = +min.slice(0, 4);
  const endY = +max.slice(0, 4);
  const months = [];
  for (let y = startY; y <= endY; y++) {
    for (let m = 1; m <= 12; m++) {
      months.push(`${y}/${String(m).padStart(2, '0')}`);
    }
  }

  // 積み上げの並びは合計の多いカテゴリから。凡例の順もこれに従う
  const cats = [...catTotal.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const series = cats.map(cat => ({
    name: cat,
    type: 'bar',
    stack: 'total',
    data: months.map(ym => (byMonth.get(ym) && byMonth.get(ym).get(cat)) || 0),
  }));
  return JSON.stringify({months, series});
});


/*
 * 著者一覧ページ
 */
// 年ごとの寄稿者数を 継続・新規・再開 に分けて返す (#2145)。
// 新規 = その年が初投稿。
// 再開 = 過去に投稿があるが、前年には無い（2年以上あいた）。
// 継続 = 前年にも投稿がある
hexo.extend.helper.register('yearly_author_types', function() {
  const activity = new Map(); // 著者 -> 活動した年の Set
  let minY = Infinity;
  let maxY = -Infinity;
  this.site.posts.forEach(post => {
    const y = post.date.year();
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (!activity.has(post.author)) activity.set(post.author, new Set());
    activity.get(post.author).add(y);
  });
  if (minY === Infinity) {
    return JSON.stringify({years: [], continuing: [], newcomers: [], returning: []});
  }

  const size = maxY - minY + 1;
  const continuing = new Array(size).fill(0);
  const newcomers = new Array(size).fill(0);
  const returning = new Array(size).fill(0);
  activity.forEach(set => {
    const ys = [...set].sort((a, b) => a - b);
    ys.forEach((y, i) => {
      if (i === 0) {
        newcomers[y - minY]++;
      } else if (y - ys[i - 1] > 1) {
        returning[y - minY]++;
      } else {
        continuing[y - minY]++;
      }
    });
  });
  const years = [];
  for (let y = minY; y <= maxY; y++) {
    years.push(String(y));
  }
  return JSON.stringify({years, continuing, newcomers, returning});
});
