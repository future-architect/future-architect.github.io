'use strict';

const fs = require("fs");

const load = JSON.parse(fs.readFileSync("ga4_pv.json", 'utf-8'));
const map = new Map();
load.pv.forEach((obj) => {
  map.set(obj.path, obj);
});

const getGA4PV = url => map.get(url)?.pv || 0;

hexo.extend.helper.register("get_ga4_pv", url => {
  return (getGA4PV("/" + url) || 100).toLocaleString();
});

