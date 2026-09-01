'use strict';

/**
 * サイトマップを生成する。
 *
 * 以前は hexo-generator-seo-friendly-sitemap を使っていたが、
 * このプラグインが ejs 2.6.1 を抱えており、CVE-2022-29078（critical）が
 * Dependabot で報告され続けていた。プラグインは4年以上更新が止まっており、
 * 追随も期待できない。
 *
 * 公式の hexo-generator-sitemap への置き換えも検討したが、あちらは
 * site.posts だけを対象とする単一ファイルを出すため、タグ709件・
 * カテゴリ17件がサイトマップから消え、サイトマップインデックス構造も
 * 失われる（子サイトマップのURLが404になる）。_config.yml の alias で
 * 旧タグURLを丁寧に転送している運用とも矛盾するため採らなかった。
 *
 * ここでは従来と同じURL集合・同じインデックス構造を維持したまま、
 * ejs 依存だけを外す。
 */

// 種別ごとの更新頻度と優先度。従来のプラグインが出していた値をそのまま踏襲する
const ROOT = { changefreq: 'daily', priority: '1' };
const RULES = {
  post: { changefreq: 'weekly', priority: '0.6' },
  page: { changefreq: 'weekly', priority: '0.8' },
  tag: { changefreq: 'weekly', priority: '0.2' },
  category: { changefreq: 'weekly', priority: '0.2' },
};

const XML_HEAD =
  '<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="sitemap.xsl"?>\n';
const URLSET_ATTR =
  'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
  ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' +
  ' xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"' +
  ' xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';

const escapeXml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * config.url の末尾スラッシュ有無に左右されないよう正規化したうえで、
 * サイトマップの仕様に沿って URL エスケープする。
 *
 * タグ・カテゴリのパスは日本語をそのまま含む（例: tags/認証認可/）。
 * sitemap.org の仕様では <loc> は URL エスケープされている必要があるため
 * encodeURI をかける（/ や : は保持される）。
 * index.html は末尾を落として、ディレクトリ形式の URL に揃える。
 */
const absUrl = (base, path) => {
  const clean = String(path)
    .replace(/^\//, '')
    .replace(/index\.html$/, '');
  return encodeURI(`${base.replace(/\/$/, '')}/${clean}`);
};

const iso = (d) => (d && typeof d.toISOString === 'function' ? d.toISOString() : null);

function urlTag({ loc, lastmod, changefreq, priority }) {
  const lines = [`        <loc>${escapeXml(loc)}</loc>`];
  if (lastmod) lines.push(`        <lastmod>${lastmod}</lastmod>`);
  lines.push(`        <changefreq>${changefreq}</changefreq>`);
  lines.push(`        <priority>${priority}</priority>`);
  return `    <url>\n${lines.join('\n')}\n    </url>`;
}

function urlset(entries) {
  return `${XML_HEAD}<urlset ${URLSET_ATTR}>\n\n${entries.join('\n\n')}\n\n</urlset>\n`;
}

hexo.extend.generator.register('sitemap', function (locals) {
  const base = this.config.url;
  // 子サイトマップはいずれも先頭にサイトのルートを含む（従来の出力に合わせる）
  const root = urlTag({ loc: absUrl(base, ''), ...ROOT });

  // 最終更新はコンテンツ側の updated を優先し、無ければ date を使う
  const lastmodOf = (item) => iso(item.updated) || iso(item.date);

  const build = (items, rule, pathOf) => {
    const entries = items.map((item) =>
      urlTag({
        loc: absUrl(base, pathOf(item)),
        lastmod: lastmodOf(item),
        ...rule,
      }),
    );
    return urlset([root, ...entries]);
  };

  // タグ・カテゴリの最終更新は、そこに属する記事の最新日時とみなす
  const taxonomyLastmod = (taxonomy) => {
    const dates = taxonomy.posts.toArray().map(lastmodOf).filter(Boolean);
    return dates.length ? dates.sort().pop() : null;
  };
  const buildTaxonomy = (items, rule) =>
    urlset([
      root,
      ...items.map((t) =>
        urlTag({
          loc: absUrl(base, t.path),
          lastmod: taxonomyLastmod(t),
          ...rule,
        }),
      ),
    ]);

  // 404 はサイトマップに載せるものではないため除く。
  // 従来のプラグインは pages をそのまま出しており 404.html が混ざっていた
  const pages = locals.pages.filter((p) => !/(^|\/)404\.html$/.test(p.path));

  // 並びはパス順にそろえる。toArray() は Warehouse の格納順＝ファイルを
  // 読み終えた順で、コールドビルドのたびに入れ替わる。サイトマップに
  // 並び順の意味は無いが、順序が不定だと差分の照合でノイズになる
  const byPath = (a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const sorted = (list) => list.toArray().sort(byPath);

  const children = [
    { path: 'post-sitemap.xml', data: build(sorted(locals.posts), RULES.post, (p) => p.path) },
    { path: 'page-sitemap.xml', data: build(sorted(pages), RULES.page, (p) => p.path) },
    {
      path: 'category-sitemap.xml',
      data: buildTaxonomy(sorted(locals.categories), RULES.category),
    },
    { path: 'tag-sitemap.xml', data: buildTaxonomy(sorted(locals.tags), RULES.tag) },
  ];

  // 子サイトマップの lastmod は、その中で最も新しい更新日時
  const newest = (xml) => {
    const m = xml.match(/<lastmod>([^<]+)<\/lastmod>/g) || [];
    return (
      m
        .map((x) => x.replace(/<\/?lastmod>/g, ''))
        .sort()
        .pop() || null
    );
  };
  const index =
    XML_HEAD +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n' +
    children
      .map((c) => {
        const lm = newest(c.data);
        return (
          `    <sitemap>\n        <loc>${absUrl(base, c.path)}</loc>` +
          (lm ? `\n        <lastmod>${lm}</lastmod>` : '') +
          `\n    </sitemap>`
        );
      })
      .join('\n\n') +
    '\n\n</sitemapindex>\n';

  return [...children, { path: 'sitemap.xml', data: index }];
});
