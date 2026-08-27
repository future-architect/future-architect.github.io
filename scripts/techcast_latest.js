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

// サイドバーの Tech Cast（_widget/techcast.ejs）に渡す最新3本。
// 以前はここで HTML を組み立てていたが、リンクが textlint の
// no-unmarked-external-link から見えない場所にあった（#2729）。
// マークアップは EJS に置き、ここは「どの3本か」と「NEW を付けるか」だけを決める
hexo.extend.helper.register('techcast_items', function () {
  const threshold = new Date();
  // 公開から2週間は NEW を付ける
  threshold.setDate(threshold.getDate() - 15);

  return feedItems.slice(0, 3).map((item) => ({
    title: item.title,
    link: item.link,
    isNew: threshold.toISOString() <= item.isoDate,
  }));
});

// itunes:duration は "00:34:25" の形。1時間未満の回は先頭の "00:" を落とす
function formatDuration(duration) {
  const match = /^0+:(\d{1,2}:\d{2})$/.exec(String(duration || ''));
  return match ? match[1] : String(duration || '');
}

// 特設ページ（/specials/techcast/）のエピソード一覧に渡す全話 (#2854)。
// 並びは RSS のまま（新しい順）。回数を返さないのは、itunes:episode の実データが
// 壊れているため（#17 が 1、#5 が 4、#15 と #3 が空）。番号を名乗れるのは
// 収録側が付けたタイトルの「#N」だけなので、そのままタイトルとして出す
hexo.extend.helper.register('techcast_episodes', function () {
  return feedItems.map((item) => ({
    title: item.title,
    link: item.link,
    date: new Date(item.isoDate),
    duration: formatDuration(item.itunes && item.itunes.duration),
  }));
});
