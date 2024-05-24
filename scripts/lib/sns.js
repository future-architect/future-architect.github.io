'use strict';

const fs = require("fs");

const load = JSON.parse(fs.readFileSync("sns_count_cache.json", 'utf-8'));
const map = new Map();
load.forEach((obj) => {
  map.set(obj.URL, obj);
});

const getTwitterCnt = url => map.get(url)?.Twitter?.Count || 0;
const getFacebookCnt = url => map.get(url)?.FaceBook?.Count || 0;
const getHatebuCnt = url => map.get(url)?.Hatebu?.Count|| 0;
const getPocketCnt = url => map.get(url)?.Pocket?.Count || 0;
const getFeedlyCnt = url => map.get(url)?.Feedly?.Count || 0;
const getSNSCnt = url => {
  return getTwitterCnt(url) + getFacebookCnt(url) + getHatebuCnt(url) + getPocketCnt(url) + getFeedlyCnt(url);
}

module.exports = {
  getSNSCnt: getSNSCnt,
  getTwitterCnt:getTwitterCnt,
  getFacebookCnt: getFacebookCnt,
  getHatebuCnt:getHatebuCnt,
  getPocketCnt : getPocketCnt,
  getFeedlyCnt: getFeedlyCnt,
};
