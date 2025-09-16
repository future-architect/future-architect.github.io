const fetch = require('node-fetch');
const cheerio = require('cheerio');

async function getOgpData(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);

    const getMetaContent = (prop) => $(`meta[property="${prop}"]`).attr('content') || $(`meta[name="${prop}"]`).attr('content');

    let description = getMetaContent('og:description') || getMetaContent('description');
    if (description === 'NULL') {
      description = '';
    }

    const ogp = {
      title: getMetaContent('og:title') || $('title').text(),
      description: description, // 取得したdescriptionを設定
      image: getMetaContent('og:image'),
      siteName: getMetaContent('og:site_name'),
      favicon: $('link[rel="icon"], link[rel="shortcut icon"]').attr('href')
    };

    if (ogp.favicon && !ogp.favicon.startsWith('http')) {
      const urlObj = new URL(url);
      ogp.favicon = `${urlObj.protocol}//${urlObj.hostname}${ogp.favicon}`;
    }

    return ogp;
  } catch (error) {
    console.error(`Error fetching OGP data for ${url}:`, error);
    return null;
  }
}

hexo.extend.tag.register('link_preview', async function(args) {
  const url = args[0];
  if (!url) return '';

  const data = await getOgpData(url);

  if (!data || !data.title) {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  }

  // 出力時に必ず空文字をフォールバックにする
  const title = data.title || '';
  const description = data.description || '';
  const image = data.image;
  const siteName = data.siteName || new URL(url).hostname;
  const favicon = data.favicon;

  return `
    <div class="link-preview-card">
      <a href="${url}" target="_blank" rel="noopener noreferrer" class="link-preview-card-anchor">
        <div class="link-preview-card-main">
          <div class="link-preview-card-title">${title}</div>
          <div class="link-preview-card-description">${description}</div>
          <div class="link-preview-card-meta">
            ${favicon ? `<img src="${favicon}" class="link-preview-card-favicon" alt="favicon">` : ''}
            <span>${siteName}</span>
          </div>
        </div>
        ${image ? `<div class="link-preview-card-image" style="background-image: url('${image}')"></div>` : ''}
      </a>
    </div>
  `;
}, {async: true});
