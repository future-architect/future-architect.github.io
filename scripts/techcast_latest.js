'use strict';

const fetch = require('node-fetch');
const HttpsProxyAgent = require('https-proxy-agent');
const RssParser = require('rss-parser');

let feedItems = [];

(async () => {
  const rssParser = new RssParser();

  let proxyAgent;
  if (process.env.http_proxy) {
    proxyAgent = new HttpsProxyAgent.HttpsProxyAgent(process.env.http_proxy);
  }

  const techcastResponse = await fetch('https://anchor.fm/s/2890e980/podcast/rss', {
    agent: proxyAgent,
  });
  const techcastResponseText = await techcastResponse.text();

  rssParser
    .parseString(techcastResponseText)
    .then((feed) => {
      feedItems = feed.items;
    })
    .catch((error) => {
      console.error('TechCast RSS 取得失敗', error);
    });
})();

// 公開から15日以内を新着として扱う。記事一覧の NEW（scripts/lib/post_list.js）が
// 30日なのに対して短いのは、こちらが「今週出た回」の合図で、記事の新顔とは役が違うため
function isNewEpisode(isoDate) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - 15);
  return threshold.toISOString() <= isoDate;
}

// itunes:duration は "00:34:25" の形。1時間未満の回は先頭の "00:" を落とす
function formatDuration(duration) {
  const match = /^0+:(\d{1,2}:\d{2})$/.exec(String(duration || ''));
  return match ? match[1] : String(duration || '');
}

// エピソード一覧の全話。特設ページ（/specials/techcast/）が表に出し、
// ホームの特設パネル（#2880）は先頭1件の isNew だけを見る。
// 並びは RSS のまま（新しい順）。回数を返さないのは、itunes:episode の実データが
// 壊れているため（#17 が 1、#5 が 4、#15 と #3 が空）。番号を名乗れるのは
// 収録側が付けたタイトルの「#N」だけなので、そのままタイトルとして出す
hexo.extend.helper.register('techcast_episodes', function () {
  return feedItems.map((item) => ({
    title: item.title,
    link: item.link,
    date: new Date(item.isoDate),
    duration: formatDuration(item.itunes && item.itunes.duration),
    isNew: isNewEpisode(item.isoDate),
  }));
});
