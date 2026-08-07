'use strict';

const fs = require("fs");

const load = JSON.parse(fs.readFileSync("ga4_pv.json", 'utf-8'));
const map = new Map();
load.pv.forEach((obj) => {
  map.set(obj.path, obj);
});

const getGA4PV = url => map.get(url)?.pv || 0;

// 実測値が無いときは 0 を返す。以前は 100 を返していたが、実際に pv が 100 の
// 記事も 55 件あり、表示上どちらか区別できなかった。公開直後の記事に
// 架空の「100 View」が出るのは、読了時間を出さないのと同じ理由で避けたい
hexo.extend.helper.register("get_ga4_pv", url => {
  const pv = getGA4PV("/" + url);
  return pv > 0 ? pv.toLocaleString() : '';
});
