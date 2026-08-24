'use strict';

const fs = require('fs');

const load = JSON.parse(fs.readFileSync('sns_count_cache.json', 'utf-8'));
const map = new Map();
load.forEach((obj) => {
  map.set(obj.URL, obj);
});

const getTwitterCnt = (url) => map.get(url)?.Twitter?.Count || 0;
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

// 反響の段 (#2755)。数字だけでは大小が掴めないので、白抜き → 塗り → 差し色と
// 記号自体を変える。閾値は実データから決めた（全1,484記事）。
//   100以上 = 148件、1000以上 = 9件
// ホーム1ページには ♡ が72個出るが、その内訳は塗り24個・クリムゾン1個になる。
// クリムゾンを1000以上に置いたのは「差し色は画面内で同時に1箇所」を守るため。
// 色を持つのは記号だけで、数字は地の文の段に置く（数字まで赤いと警告に見える）
const SNS_FILLED = 100;
const SNS_HOT = 1000;

const snsHeart = (n) => ({
  glyph: n >= SNS_FILLED ? '&#9829;' : '&#9825;',
  className: n >= SNS_HOT ? 'snscount-icon-hot' : '',
});

module.exports = {
  getSNSCnt: getSNSCnt,
  snsHeart: snsHeart,
  getTwitterCnt: getTwitterCnt,
  getFacebookCnt: getFacebookCnt,
  getHatebuCnt: getHatebuCnt,
  getPocketCnt: getPocketCnt,
  getFeedlyCnt: getFeedlyCnt,
};
