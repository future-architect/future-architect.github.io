'use strict';

/**
 * RSS / Atom フィードの生成（#1278）。hexo-generator-feed からの置き換え。
 *
 * 置き換えた理由:
 * - Feedly 等の主要リーダーは標準の <icon> ではなく webfeeds 名前空間
 *   （webfeeds:icon 等）を見るため「icon 設定を入れたが効果なし」となっていた。
 *   プラグインはテンプレート差し替えができても nunjucks フィルタを追加できず、
 *   下記のリンク除去とあわせテンプレートだけでは表現できない
 * - 本文中の <a> を残したまま Slack 等の連携に流れると URL が OGP 展開されて
 *   通知が肥大するため、フィード側でリンクを外す（テキストは残す）
 * - カテゴリ別フィード（#2294）には自作 generator がどのみち必要になる
 *
 * 購読 URL（/atom.xml /rss2.xml）と件数（25）は従来のまま変えない。
 * <updated> / pubDate は記事の date から決める。既定の mtime だと CI の
 * checkout 時刻になり、デプロイのたびに全記事が更新済み扱いになるため。
 */

const {full_url_for} = require('hexo-util');

// テーマのリンク色（css-src/_variables.styl の color-link）。Feedly が購読画面の装飾に使う
const ACCENT_COLOR = '258fb8';

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cdata(s) {
  return '<![CDATA[' + String(s).replace(/\]\]>/g, ']]]]><![CDATA[>') + ']]>';
}

// フィード用の本文。リンクはテキスト化し（OGP展開対策）、script（mermaid の
// フォールバック等）はリーダーで動かないので除去する
function feedContent(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<a\b[^>]*>/gi, '')
    .replace(/<\/a>/gi, '');
}

// 概要は lede（一覧・OGP と同じ文言）。無い記事はタグを落とした先頭140字
function summaryOf(post) {
  if (post.lede) return post.lede;
  return post.content
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
}

function categoriesOf(post) {
  return post.categories.toArray().concat(post.tags.toArray());
}

function buildAtom({title, subtitle, siteUrl, feedUrl, icon, largeIcon, posts}) {
  const updated = posts.length ? posts[0].date.toISOString() : new Date(0).toISOString();
  let xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:webfeeds="http://webfeeds.org/rss/1.0">
  <title>${esc(title)}</title>
  <subtitle>${esc(subtitle)}</subtitle>
  <icon>${esc(icon)}</icon>
  <logo>${esc(largeIcon)}</logo>
  <webfeeds:icon>${esc(largeIcon)}</webfeeds:icon>
  <webfeeds:accentColor>${ACCENT_COLOR}</webfeeds:accentColor>
  <link href="${esc(feedUrl)}" rel="self"/>
  <link href="${esc(siteUrl)}"/>
  <updated>${updated}</updated>
  <id>${esc(siteUrl)}</id>
  <generator uri="https://hexo.io/">Hexo</generator>
`;
  for (const post of posts) {
    xml += `  <entry>
    <title>${esc(post.title)}</title>
    <link href="${esc(post.permalink)}"/>
    <id>${esc(post.permalink)}</id>
    <published>${post.date.toISOString()}</published>
    <updated>${post.date.toISOString()}</updated>
    <author><name>${esc(post.author || title)}</name></author>
    <content type="html">${cdata(feedContent(post.content))}</content>
    <summary type="html">${esc(summaryOf(post))}</summary>
${categoriesOf(post).map((c) => `    <category term="${esc(c.name)}" scheme="${esc(c.permalink)}"/>`).join('\n')}
  </entry>
`;
  }
  return xml + '</feed>\n';
}

function buildRss2({title, subtitle, siteUrl, feedUrl, icon, largeIcon, posts}) {
  const updated = posts.length ? posts[0].date.toDate().toUTCString() : new Date(0).toUTCString();
  let xml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:webfeeds="http://webfeeds.org/rss/1.0">
  <channel>
    <title>${esc(title)}</title>
    <link>${esc(siteUrl)}</link>
    <description>${esc(subtitle)}</description>
    <language>ja</language>
    <image>
      <url>${esc(icon)}</url>
      <title>${esc(title)}</title>
      <link>${esc(siteUrl)}</link>
    </image>
    <webfeeds:icon>${esc(largeIcon)}</webfeeds:icon>
    <webfeeds:accentColor>${ACCENT_COLOR}</webfeeds:accentColor>
    <atom:link href="${esc(feedUrl)}" rel="self" type="application/rss+xml"/>
    <pubDate>${updated}</pubDate>
    <generator>https://hexo.io/</generator>
`;
  for (const post of posts) {
    xml += `    <item>
      <title>${esc(post.title)}</title>
      <link>${esc(post.permalink)}</link>
      <guid>${esc(post.permalink)}</guid>
      <pubDate>${post.date.toDate().toUTCString()}</pubDate>
      <description>${esc(summaryOf(post))}</description>
      <content:encoded>${cdata(feedContent(post.content))}</content:encoded>
${categoriesOf(post).map((c) => `      <category domain="${esc(c.permalink)}">${esc(c.name)}</category>`).join('\n')}
    </item>
`;
  }
  return xml + `  </channel>
</rss>
`;
}

hexo.extend.generator.register('feed', (locals) => {
  const config = hexo.config;
  const feedCfg = Object.assign({limit: 25, icon: 'feed_icon.png'}, config.feed);
  const posts = locals.posts.sort('-date').toArray().slice(0, feedCfg.limit);

  const opts = {
    title: config.title,
    subtitle: config.description,
    siteUrl: full_url_for.call(hexo, '/'),
    icon: full_url_for.call(hexo, feedCfg.icon),
    // webfeeds:icon は購読画面で大きく出るため、57px の feed_icon より高解像度のものを使う
    largeIcon: full_url_for.call(hexo, 'apple-touch-icon.png'),
    posts,
  };

  const results = [
    {path: 'atom.xml', data: buildAtom(Object.assign({feedUrl: full_url_for.call(hexo, 'atom.xml')}, opts))},
    {path: 'rss2.xml', data: buildRss2(Object.assign({feedUrl: full_url_for.call(hexo, 'rss2.xml')}, opts))},
  ];

  // カテゴリ別フィード（#2294）。パスはカテゴリページ配下の
  // categories/<カテゴリ>/atom.xml。rss2 はサイト全体の互換用にだけ残し、
  // カテゴリ別は atom のみとする。タグ別は購読需要が見えてから検討する
  for (const category of locals.categories.toArray()) {
    const categoryPosts = category.posts.sort('-date').toArray().slice(0, feedCfg.limit);
    if (categoryPosts.length === 0) continue;
    const path = category.path + 'atom.xml';
    results.push({
      path,
      data: buildAtom(Object.assign({}, opts, {
        title: `${category.name} カテゴリ | ${config.title}`,
        subtitle: `${category.name} カテゴリの記事一覧`,
        siteUrl: full_url_for.call(hexo, category.path),
        feedUrl: full_url_for.call(hexo, path),
        posts: categoryPosts,
      })),
    });
  }

  return results;
});
