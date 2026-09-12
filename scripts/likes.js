'use strict';

const fs = require('fs');
const path = require('path');

/**
 * いいねの数（#1949）。
 *
 * 数は Cloudflare Worker + KV が持ち、update-cache.yml が毎日ダンプして
 * like_count_cache.json にコミットする。表示はここで焼き込むので、
 * 読者のブラウザから数を読みに行くリクエストは発生しない。
 */

// permalink の :year:month:day:postid と同じ形。KV のキーもこの ID で、
// _config.yml の alias で URL を付け替えても数が残る
const POSTID = /^20\d{6}[a-z]?$/;

// scripts/ はホットリロードされないので、プロセスの生存中は読み直さない
let counts = null;

function load() {
  if (counts) return counts;
  try {
    const file = path.join(hexo.base_dir, 'like_count_cache.json');
    counts = JSON.parse(fs.readFileSync(file, 'utf8')).likes || {};
  } catch (e) {
    // バッチが回るまでは存在しない。0本として描く
    counts = {};
  }
  return counts;
}

hexo.extend.helper.register('like_post_id', function (post) {
  const matched = /articles\/([^/]+)\//.exec((post && post.path) || '');
  return matched && POSTID.test(matched[1]) ? matched[1] : '';
});

hexo.extend.helper.register('like_count', function (postid) {
  return load()[postid] || 0;
});
