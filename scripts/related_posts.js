'use strict';

// 関連記事の最大表示件数
// 記事が長文化する傾向にあるため、記事末尾のスクロール量を抑える目的で絞っている
const maxCount = 3;
const { getSNSCnt } = require('./lib/sns');
const { postListItem } = require('./lib/post_list');
const { navLinkedPaths } = require('./lib/series');

// 親を経由した一致を1段ごとに弱める係数
const DECAY = 0.5;

// オントロジー展開はサイト全体で不変なので、一度だけ集計して使い回す
let ontologyCache = null;

/**
 * 記事のタグ集合を source/_data/tag_ontology.yml の broader で推移的に
 * 展開した「トークン集合」を全記事分作る。
 *
 * 執筆者は具体タグ（daisyUI）だけ付ければよく、抽象タグ（CSS / IaC 等）を
 * 付けるかの判断を執筆時に強いない。抽象への接続はオントロジーが肩代わりし、
 * タグを直接共有しない同系統の記事もここで繋がる (#2292)。
 */
function buildTokenIndex(site) {
  const ontology = (site.data && site.data.tag_ontology) || {};

  const expandMemo = new Map();
  const expand = (name) => {
    if (expandMemo.has(name)) return expandMemo.get(name);
    const depths = new Map([[name, 0]]);
    const queue = [[name, 0]];
    while (queue.length) {
      const [cur, d] = queue.shift();
      const node = ontology[cur];
      for (const parent of (node && node.broader) || []) {
        // より浅い経路で到達済みなら辿り直さない（オントロジーに循環があってもここで止まる）
        if (!depths.has(parent) || depths.get(parent) > d + 1) {
          depths.set(parent, d + 1);
          queue.push([parent, d + 1]);
        }
      }
    }
    expandMemo.set(name, depths);
    return depths;
  };

  const postTokens = new Map(); // 記事ID -> Map(トークン -> 最小深さ)
  const df = new Map(); // トークン -> 展開後にそれを持つ記事数
  const postsByToken = new Map(); // トークン -> 記事の配列
  site.posts.forEach((post) => {
    const tokens = new Map();
    post.tags.forEach((tag) => {
      for (const [t, d] of expand(tag.name)) {
        if (!tokens.has(t) || tokens.get(t) > d) tokens.set(t, d);
      }
    });
    postTokens.set(post._id, tokens);
    for (const t of tokens.keys()) {
      df.set(t, (df.get(t) || 0) + 1);
      if (!postsByToken.has(t)) postsByToken.set(t, []);
      postsByToken.get(t).push(post);
    }
  });

  return { postTokens, df, postsByToken };
}

/**
 * 上位から maxCount 本選ぶ。ただし同じ連載の記事で全部は埋めない。
 *
 * 3枠すべてが同じ連載になると、連載ナビと索引で辿れる範囲しか出ず、
 * 関連記事の枠から得られる導線がゼロになる。少なくとも1枠は連載の外から取る。
 *
 * 逆に締め出しはしない。テーマが自由な連載（春の入門祭りなど）では、
 * 同じ連載でも独立した記事なので、関連が強ければ出す価値がある。
 */
function pickRelatedPosts(posts, series) {
  if (!series) return posts.slice(0, maxCount);

  const picked = [];
  const deferred = [];
  for (const p of posts) {
    if (picked.length >= maxCount) break;
    const sameSeries = p.series === series;
    if (sameSeries && picked.filter((x) => x.series === series).length >= maxCount - 1) {
      deferred.push(p);
      continue;
    }
    picked.push(p);
  }
  // 連載の外から埋まらなかったときは、抑えた分を戻す
  return picked.concat(deferred).slice(0, maxCount);
}

// HTMLを生成するロジックを共通関数として外に切り出す
function generateRelatedPostsHtml(posts, series) {
  posts = pickRelatedPosts(posts, series);
  const count = Math.min(maxCount, posts.length);
  if (count === 0) {
    return `<p class="related-posts-none">No related post.</p>`;
  }

  let result = '';
  for (let i = 0; i < count; i++) {
    const related = posts[i];
    if (related) {
      const scoreText = related.score ? `スコア: ${related.score.toFixed(4)}` : '';
      const titleAttr = `${related.lede} ${scoreText}`.trim();
      // マークアップは lib/post_list.js に集約している
      result += postListItem(related, 'related-posts-item', titleAttr, true);
    }
  }

  return `
    <div class="widget">
      <ul class="related-post-link">${result}</ul>
    </div>`;
}

// 「この記事を参照している記事」（reference_posts.js）に出る記事のID
// 同じ記事が関連記事にも並ばないよう、除外するために使う
function getReferencePostIds(ctx, post) {
  return new Set(
    ctx.site.posts.data
      .filter((p) => p.path !== post.path && p.content.includes(post.path))
      .map((p) => p._id),
  );
}

// カテゴリから関連記事を取得する関数（変更なし）
function getCategoryRelatedPosts(ctx, post, isExcluded) {
  const currentCategory = post.categories.data[0];
  if (!currentCategory) {
    return [];
  }

  const categoryPosts = currentCategory.posts.data.filter(
    (p) => p._id !== post._id && !isExcluded(p),
  );

  categoryPosts.sort((a, b) => {
    const snsA = getSNSCnt(a.permalink);
    const snsB = getSNSCnt(b.permalink);
    if (snsA !== snsB) {
      return snsB - snsA;
    } else {
      // 日付も同じなら パスで決める（決着が無いとビルドごとに並びが変わる）
      return (
        b.date.valueOf() - a.date.valueOf() || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
      );
    }
  });

  return categoryPosts;
}

hexo.extend.helper.register('list_related_posts', function () {
  const post = this.post;
  if (!post.tags || !post.categories) {
    return `<p class="related-posts-none">No related post.</p>`;
  }

  // 0. 記事末尾で同じ記事が二度出ないよう、除外対象を先に求める。
  //    「この記事を参照している記事」と、連載ナビが既にリンクしている記事（索引・前・次）
  const referenceIds = getReferencePostIds(this, post);
  const linked = navLinkedPaths(this.site, post);
  // 同じ連載の記事は出さない。連載ナビが索引へのリンクを持ち、索引には
  // その連載の全記事が並ぶので、連載内はすべてナビ経由で辿れる。
  // 関連記事の役割は他の導線で辿り着けない関係を見せることなので枠を使わない
  const isExcluded = (p) => referenceIds.has(p._id) || linked.has(p.path);

  // 1. 全著者数を取得し、著者のIDFを計算
  const allPostsCount = this.site.posts.length;
  const authors = [...new Set(this.site.posts.data.map((p) => p.author))];
  const authorIDF = {};
  authors.forEach((author) => {
    const postCountByAuthor = this.site.posts.data.filter((p) => p.author === author).length;
    authorIDF[author] = Math.log(allPostsCount / postCountByAuthor);
  });

  // 2. 関連度スコアリング（オントロジー展開したタグと著者のIDFを考慮）
  if (!ontologyCache) ontologyCache = buildTokenIndex(this.site);
  const { postTokens, df, postsByToken } = ontologyCache;
  const myTokens = postTokens.get(post._id) || new Map();

  // 候補は「展開後の集合が交差する記事」。タグを直接共有しない記事もここで入る
  const candidateIds = new Set();
  const candidates = [];
  for (const t of myTokens.keys()) {
    for (const p of postsByToken.get(t) || []) {
      if (p._id === post._id || candidateIds.has(p._id) || isExcluded(p)) continue;
      candidateIds.add(p._id);
      candidates.push(p);
    }
  }

  if (candidates.length === 0) {
    // タグ関連記事がなければカテゴリの記事を取得し、HTMLを生成して返す
    console.log(
      `[INFO] Related Posts: No tag-related posts found for "${post.title}". Falling back to category.`,
    );
    const categoryPosts = getCategoryRelatedPosts(this, post, isExcluded);
    return generateRelatedPostsHtml(categoryPosts, post.series);
  }

  // IDF は展開後の頻度で計算する。抽象タグ（CSS 等）は展開後に大量の記事が
  // 持つトークンになるので IDF が自然に下がり、「抽象タグで繋がっただけ」の
  // 記事は弱くしか効かない。しきい値ではなく構造で氾濫を防ぐ。
  // さらに親経由の一致は深さ1段ごとに DECAY 倍し、
  // 直接一致 > 親子（片側が親を直接持つ）> 兄弟（親を共有）の順を保つ
  const idf = (t) => Math.log(allPostsCount / df.get(t));
  const relatedPosts = candidates.map((p) => {
    const theirTokens = postTokens.get(p._id);
    let score = 0;
    let sharesDirectTag = false;
    for (const [t, myDepth] of myTokens) {
      const theirDepth = theirTokens.get(t);
      if (theirDepth === undefined) continue;
      if (myDepth === 0 && theirDepth === 0) sharesDirectTag = true;
      score += idf(t) * Math.pow(DECAY, myDepth + theirDepth);
    }

    // タグを多く持つ記事ほど1タグあたりの意味が薄いため、タグ数で正規化する。
    // これがないと、大きなタグを複数持つ記事が全記事の関連記事を占めてしまう
    score /= Math.sqrt(p.tags.length || 1);

    // 著者点は「関連しているか」の証拠ではなく、関連済み候補間の調停。
    // 立証は直接タグにしかできないので、タグを直接共有する候補にだけ乗せる。
    // 展開経由だけの候補に乗せると、弱い接続（0.3点程度）に著者点（3点前後）が
    // 乗って直接一致の記事を押し出す（#2292 の影響測定では84枠全てが同著者だった）
    if (sharesDirectTag && p.author === post.author) {
      score += authorIDF[p.author];
    }

    return { ...p, score: score };
  });

  // 3. 関連度スコアでソートし、同スコアの場合は公開日が近い記事を優先する。
  //    技術記事は前提バージョンなど時代の文脈に依存するため、同じ関連度なら
  //    同時期の記事の方が読み継ぎやすい。連載の古い回が埋もれる問題も解消する。
  //    ただし過去方向は未来方向より重く扱い、わずかに新しい記事へ流れるようにする
  const PAST_PENALTY = 2;
  const dateDistance = (p) => {
    const diff = p.date.valueOf() - post.date.valueOf();
    return diff >= 0 ? diff : -diff * PAST_PENALTY;
  };

  // 最後にパスで決める。スコアと日付距離が同点になる組があり、
  // 決着が無いとビルドごとに選ばれる記事が入れ替わる
  relatedPosts.sort(
    (a, b) =>
      b.score - a.score ||
      dateDistance(a) - dateDistance(b) ||
      (a.path < b.path ? -1 : a.path > b.path ? 1 : 0),
  );

  // 4. 記事数がmaxCountに満たない場合はカテゴリから補填
  if (relatedPosts.length < maxCount) {
    const postsToFill = getCategoryRelatedPosts(this, post, isExcluded);
    postsToFill.forEach((p) => {
      if (relatedPosts.findIndex((rp) => rp._id === p._id) === -1) {
        relatedPosts.push(p);
      }
    });
  }

  // 最終的な記事リストをHTMLに変換して返す
  return generateRelatedPostsHtml(relatedPosts, post.series);
});
