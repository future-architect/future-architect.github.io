"use strict";

const fetch = require("node-fetch");
const HttpsProxyAgent = require("https-proxy-agent");
const RssParser = require("rss-parser");

let feedItems = [];

// プロキシ対応
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

(async () => {
  const rssParser = new RssParser();

  let proxyAgent;
  if (process.env.http_proxy) {
    proxyAgent = new HttpsProxyAgent.HttpsProxyAgent(process.env.http_proxy);
  }

  const techcastResponse = await fetch(
    "https://anchor.fm/s/2890e980/podcast/rss",
    { agent: proxyAgent }
  );
  const techcastResponseText = await techcastResponse.text();

  rssParser
    .parseString(techcastResponseText)
    .then((feed) => {
      feedItems = feed.items;
    })
    .catch((error) => {
      console.error("TechCast RSS 取得失敗", error);
    });
})();

hexo.extend.helper.register("generate_techcast_post", function () {
  const currentTime = new Date();
  const pastDate = currentTime.getDate() - 15; // 2week
  currentTime.setDate(pastDate);

  const label = (item) => {
    if (currentTime.toISOString() <= item.isoDate) {
      return `<span class="newitem">NEW</span>`;
    }
    return "";
  };

  const feedHTML = feedItems
    .slice(0, 3)
    .map(
      (item) =>
        `<li><a href="${
          item.link
        }" title="フューチャーがお届けするポッドキャストです。${
          item.title
        }" target="_blank" rel="noopener">${label(item)} ${item.title}</a></li>`
    )
    .join("\n");

  return `
  <div class="class="widget-wrap">
  <div class="widget">
    <ul class="nav techcast">
      ${feedHTML}
    </ul>
  </div>
  </div>
  `;
});
