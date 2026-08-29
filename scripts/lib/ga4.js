'use strict';

const fs = require('fs');

const load = JSON.parse(fs.readFileSync('ga4_pv.json', 'utf-8'));
const map = new Map(load.pv.map((obj) => [obj.path, obj.pv]));

// 実測値が無いときは 0。GA4 の値は 100 単位に丸められている（全1,499件が
// 100 の倍数）ので、合計を鍵にして並べると同点が出る
const getGA4PV = (url) => map.get(url) || 0;

module.exports = { getGA4PV };
