'use strict';

const {getSNSCnt, getTwitterCnt, getFacebookCnt, getHatebuCnt, getPocketCnt, getFeedlyCnt} = require('./lib/sns');

hexo.extend.helper.register("get_pocket_count", url => {
  return getPocketCnt(url) || "Pocket";
});

hexo.extend.helper.register("get_hatebu_count", url => {
  return getHatebuCnt(url) || "はてな";
});

hexo.extend.helper.register("get_fb_count", url => {
  return getFacebookCnt(url) || "シェア";
});

hexo.extend.helper.register("get_tw_count", url => {
  return getTwitterCnt(url) || "ツイート";
});

hexo.extend.helper.register("get_feedly_count", url => {
  return getFeedlyCnt(url) ?? "Follow";
});

hexo.extend.helper.register("totalSNSCnt", url => {
  return getSNSCnt(url);
});
