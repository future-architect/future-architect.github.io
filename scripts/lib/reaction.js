'use strict';

// 「人気の」枠の PV に掛ける反応の補正 (#3290 / #3292)。
// PV の割に SNS 反応が多い記事を「読んだ人が人に見せた記事」として一段上げる。
// **基本は PV で、これは多少の補正**。
//
// **加点だけで、減点はしない** (#3292)。反応が伴わないことは記事の型
// （検索で引かれて役に立ち、わざわざ言及はされない実用記事）でも起きるので、
// そこを下げる根拠が無い。並以下は素の PV のまま置く。
//
// 比は生では使わない。絶対値には意味が無く「並の記事と比べてどうか」だけが要るので、
// 補正が掛かる母集団の中央値で割る。年代では正規化しない（比は古い記事ほど高いが、
// PV 下限を入れると 1.9 倍まで縮み、指数を通すと 21% の下駄にしかならない。
// 経過年ペナルティが 2019年の記事を 1/50 にするのに対して誤差）。
const { getSNSCnt } = require('./sns');
const { getGA4PV } = require('./ga4');

// GA4 の PV は 100 単位に丸められているので比の分母の誤差は ±50。
// これが ±5% に収まる線がここ。記事の分布ではなく GA4 の刻みから出る値なので、
// 記事が増えても動かない
const PV_FLOOR = 1000;
const EXPONENT = 0.3;
// 下限は「加点しない」の 1。中央値がそのまま境目になる。
// 上限を 1.25 に据え置くと補正の幅が 1.56倍から 1.25倍に半減し、**上限に張り付く
// 記事（274本）が中間（161本）より多くなって二値に近づく**。上へ振り直して
// 総幅を保つと、上限155本・中間280本で中間の方が多くなる
const MIN_FACTOR = 1;
const MAX_FACTOR = 1.5;

// 下限に満たない記事は補正しない（null を返す）
const ratioOf = (post) => {
  const pv = getGA4PV('/' + post.path);
  return pv >= PV_FLOOR ? getSNSCnt(post.permalink) / pv : null;
};

const medianCache = new Map();

function medianRatio(site) {
  const key = String(site.posts.length);
  if (medianCache.has(key)) return medianCache.get(key);
  const ratios = site.posts
    .map(ratioOf)
    .filter((r) => r !== null)
    .sort((a, b) => a - b);
  const median = ratios.length ? ratios[Math.floor(ratios.length / 2)] : 0;
  medianCache.set(key, median);
  return median;
}

function reactionFactor(site, post) {
  const ratio = ratioOf(post);
  if (ratio === null) return 1;
  const median = medianRatio(site);
  if (!median) return 1;
  return Math.min(MAX_FACTOR, Math.max(MIN_FACTOR, Math.pow(ratio / median, EXPONENT)));
}

module.exports = { reactionFactor, PV_FLOOR, MIN_FACTOR, MAX_FACTOR };
