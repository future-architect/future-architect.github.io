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

hexo.extend.helper.register("get_x_count", url => {
  return getTwitterCnt(url) || "ポスト";
});

hexo.extend.helper.register("get_feedly_count", url => {
  return getFeedlyCnt(url) ?? "Follow";
});

hexo.extend.helper.register("totalSNSCnt", url => {
  return getSNSCnt(url);
});
