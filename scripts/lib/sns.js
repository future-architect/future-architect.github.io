'use strict';

const fs = require('fs');
const { xMentionScore } = require('./x_mentions');

const load = JSON.parse(fs.readFileSync('sns_count_cache.json', 'utf-8'));
const map = new Map();
load.forEach((obj) => {
  map.set(obj.URL, obj);
});

// 凍結した API の値に、手で取り込んだ言及ポストの点を足す。取得日より後のポストだけを
// 足して二重計上を避ける
const getTwitterCnt = (url) => {
  const tw = map.get(url)?.Twitter;
  const id = url.match(/\/articles\/(20\d{6}[a-z]?)\/$/)?.[1];
  return (tw?.Count || 0) + (id ? xMentionScore(id, tw?.FetchAt) : 0);
};
const getFacebookCnt = (url) => map.get(url)?.FaceBook?.Count || 0;
const getHatebuCnt = (url) => map.get(url)?.Hatebu?.Count || 0;
const getPocketCnt = (url) => map.get(url)?.Pocket?.Count || 0;
const getFeedlyCnt = (url) => map.get(url)?.Feedly?.Count || 0;
const getSNSCnt = (url) => {
  return (
    getTwitterCnt(url) +
    getFacebookCnt(url) +
    getHatebuCnt(url) +
    getPocketCnt(url) +
    getFeedlyCnt(url)
  );
};

module.exports = {
  getSNSCnt: getSNSCnt,
  getTwitterCnt: getTwitterCnt,
  getFacebookCnt: getFacebookCnt,
  getHatebuCnt: getHatebuCnt,
  getPocketCnt: getPocketCnt,
  getFeedlyCnt: getFeedlyCnt,
};
