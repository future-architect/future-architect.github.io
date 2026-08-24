'use strict';

const {
  getSNSCnt,
  getTwitterCnt,
  getFacebookCnt,
  getHatebuCnt,
  getPocketCnt,
  getFeedlyCnt,
  snsHeart,
} = require('./lib/sns');

// シェア数はそのまま返す。0 のときはボタン側が数字を出さない (#2716)。
// 以前は 0 のときサービス名（「ポスト」「シェア」「はてな」「Pocket」）を
// 返しており、数字とラベルが同じ場所に混ざっていた
hexo.extend.helper.register('get_pocket_count', (url) => {
  return getPocketCnt(url);
});

hexo.extend.helper.register('get_hatebu_count', (url) => {
  return getHatebuCnt(url);
});

hexo.extend.helper.register('get_fb_count', (url) => {
  return getFacebookCnt(url);
});

hexo.extend.helper.register('get_x_count', (url) => {
  return getTwitterCnt(url);
});

hexo.extend.helper.register('get_feedly_count', (url) => {
  return getFeedlyCnt(url) ?? 'Follow';
});

hexo.extend.helper.register('totalSNSCnt', (url) => {
  return getSNSCnt(url);
});

// 反響の段は lib/sns.js が1箇所で持つ (#2755)。ここは記号とクラスを返すだけで、
// 組み立ては EJS 側（_partial/archive-all.ejs）に置く
hexo.extend.helper.register('sns_heart', (url) => {
  const count = getSNSCnt(url);
  return Object.assign({ count: count }, snsHeart(count));
});
