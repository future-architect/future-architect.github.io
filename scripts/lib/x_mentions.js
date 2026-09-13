'use strict';

// X の言及ポスト（x_mentions.json。x_mentions_import.mjs が作る）を記事ごとの点に畳む。
// X の count API は 2015 年に消えているので、sns_count_cache.json の Twitter は
// 2023-06 で凍結している。その続きをこちらが担う。
//
// 点は ポスト 1 ＋ リポスト 1/2 ＋ ブックマーク 1/4 ＋ いいね 1/8 を記事単位で切り上げる。
// 公式アカウントのポストは自己シェアなので本体の 1 を数えず、集まった反応だけを足す。
// 重みが 2 の冪なので和は二進で正確で、丸めは最後の1回だけになる。
const fs = require('fs');

const WEIGHT = { post: 1, repost: 1 / 2, bookmark: 1 / 4, like: 1 / 8 };

const loadMentions = () => {
  try {
    return JSON.parse(fs.readFileSync('x_mentions.json', 'utf-8'));
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
};

// 記事ID → ポストの配列
const byArticle = new Map();
for (const m of loadMentions()) {
  if (!m.article) continue;
  if (!byArticle.has(m.article)) byArticle.set(m.article, []);
  byArticle.get(m.article).push(m);
}

const scoreOf = (posts) =>
  posts.reduce(
    (acc, m) =>
      acc +
      (m.official ? 0 : WEIGHT.post) +
      (m.reposts || 0) * WEIGHT.repost +
      (m.bookmarks || 0) * WEIGHT.bookmark +
      (m.likes || 0) * WEIGHT.like,
    0,
  );

// `since` より後のポストだけを数える。凍結前の Twitter 数と重ねて足すときの二重計上を避ける
const xMentionScore = (articleId, since) => {
  let posts = byArticle.get(articleId) || [];
  const t = since ? Date.parse(since) : NaN;
  if (!Number.isNaN(t)) posts = posts.filter((m) => Date.parse(m.date) > t);
  return Math.ceil(scoreOf(posts));
};

module.exports = { xMentionScore, WEIGHT };
