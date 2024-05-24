"use strict";

const maxNewsDisplayCount = 3;

const fetch = require("node-fetch");
const HttpsProxyAgent = require("https-proxy-agent");
const RssParser = require("rss-parser");

let qiitaFeed = [];
let connpassFeed = [];

// プロキシ対応
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

(async () => {

  let proxyAgent;
  if (process.env.http_proxy) {
    proxyAgent = new HttpsProxyAgent.HttpsProxyAgent(process.env.http_proxy);
  }

  const qiitaRssResponse = await fetch(
    "https://qiita.com/organizations/future/activities.atom",
    { agent: proxyAgent }
  );
  const qiitaRssResponseText = await qiitaRssResponse.text();

  const rssParser = new RssParser();
  rssParser
    .parseString(qiitaRssResponseText)
    .then((feed) => {
      qiitaFeed = feed.items;
    })
    .catch((error) => {
      console.error("Qiita Organization RSS 取得失敗", error);
    });

  const connpassRssResponse = await fetch(
    "https://future.connpass.com/ja.atom",
    { agent: proxyAgent }
  );
  const connpassRssResponseText = await connpassRssResponse.text();

  rssParser
    .parseString(connpassRssResponseText)
    .then((feed) => {
      connpassFeed = feed.items;
    })
    .catch((error) => {
      console.error("Connpass RSS 取得失敗", error);
    });
})();

hexo.extend.helper.register("generate_qiita_orgs", function () {
  // connpassの場合はRSSを公開した日ではなく、イベントの開催日にしたい
  const eventDate = (feedItem) => {
    if (!feedItem.link.includes("connpass")) {
      return feedItem.pubDate;
    }
    // summary: '開催日時: 2021/05/21 19:00 ～ 20:00<br />開催場所: オンライン<br /> といった形式で格納される
    // eventDateStr is like format: 2021-09-03T19:00
    const eventDateStr = feedItem.summary
      .split(" ～ ")[0]
      .replaceAll("開催日時: ", "")
      .replaceAll(" ", "T")
      .replaceAll("/", "-");
    return eventDateStr + ":00.000Z";
  };

  const feeds = qiitaFeed.concat(connpassFeed);
  feeds.sort((a, b) => {
    if (eventDate(a) < eventDate(b)) {
      return 1;
    } else if (eventDate(a) > eventDate(b)) {
      return -1;
    } else {
      return 0;
    }
  });

  const newsDate = (item) => {
    return eventDate(item).split("T")[0];
  };

  // ニュースは直近14日にしぼりたい
  let dt = new Date();
  dt.setDate(dt.getDate() - 14);

  const latestFeeds = feeds.filter((item) => newsDate(item) >= formatted(dt));

  if (latestFeeds.length == 0) {
    return "";
  }

  const feedHTML = latestFeeds
    .slice(0, maxNewsDisplayCount)
    .map(
      (item) =>
        `<li><span class="news-date">${newsDate(item)}</span><a href="${
          item.link
        }" title="${
          item.title
        }" target="_blank" rel="noopener" class="news-title">${
          item.title
        }</a></li>`
    )
    .join("\n");

  return `
  <h2>News</h2>
  <div class="class="widget-wrap">
  <div class="widget">
    <ul class="news">
      ${feedHTML}
    </ul>
  </div>
  </div>
  `;
});

const formatted = (db) => {
  return db
    .toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .split("/")
    .join("-");
};
