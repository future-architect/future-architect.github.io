// X の検索結果（ブラウザで「名前を付けて保存」した HTML）から、記事に言及した
// ポストの明細を x_mentions.json に取り込む。X の API は有料で、count API も
// 2015年に消えているので、手で保存した画面から拾う。
//
//   node x_mentions_import.mjs ~/x_download/20260912 [...]
//
// 引数はファイルでもディレクトリでもよい（ディレクトリは中の *.html を全部読む）。
// 一覧は仮想スクロールで、画面に出ていた20件前後しか HTML に残らないため、
// スクロールしながら何度も保存したものを重ねて読む。同じポストはIDで1件にまとめ、
// 保存日時の新しい方の数字を採る。
//
// 記事の特定は、本文に URL が残っていればそれを、無ければ OGP カードの題を
// 記事タイトルと突き合わせる。どちらでも決まらないものは article: null のまま残し、
// t.co を持たせておく（後から解決できるように捨てない）。
//
// 保存するのは点に要るものだけ。投稿者・本文・カードの題は照合に使うだけで書き出さない
// （公開ポストでも人の発言をリポジトリに溜めない）。公式かどうかは official の真偽で持つ。
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const cheerio = require('cheerio');

const OUT = 'x_mentions.json';
const OFFICIAL = 'future_techblog';
const POSTS_DIR = 'source/_posts';
const ARTICLE_RE = /future-architect\.github\.io\/articles\/(20\d{6}[a-z]?)\b/;
const SITE_SUFFIX = / \| フューチャー技術ブログ$/;

const normalize = (s) => s.normalize('NFKC').replace(/\s+/g, ' ').replace(SITE_SUFFIX, '').trim();

async function listHtml(args) {
  const files = [];
  for (const a of args) {
    const s = await stat(a);
    if (s.isDirectory()) {
      for (const f of await readdir(a)) if (f.endsWith('.html')) files.push(path.join(a, f));
    } else {
      files.push(a);
    }
  }
  return files.sort();
}

// タイトル → 記事ID。同名の記事が複数あれば新しい方を採る（先に読んだ方が古い年）
async function loadTitleIndex() {
  const index = new Map();
  for (const year of (await readdir(POSTS_DIR)).sort()) {
    const dir = path.join(POSTS_DIR, year);
    if (!(await stat(dir)).isDirectory()) continue;
    for (const f of await readdir(dir)) {
      // 2020年以前は 20200116-drawio.md のようにハイフン区切り
      const m = f.match(/^(20\d{6}[a-z]?)[-_].*\.md$/);
      if (!m) continue;
      const head = (await readFile(path.join(dir, f), 'utf-8')).slice(0, 4000);
      const t = head.match(/^title:\s*(.+)$/m);
      if (!t) continue;
      let title = t[1].trim();
      if (/^(["']).*\1$/.test(title)) title = title.slice(1, -1).replace(/\\"/g, '"');
      index.set(normalize(title), m[1]);
    }
  }
  return index;
}

// 「4 件のリポスト、23 件のいいね、いいね済み、3 件のブックマーク、1427 件の表示」から数字を拾う。
// 自分の状態（いいね済み・リポストしました）が混ざるので、数字付きの語だけを見る
function parseMetrics(label) {
  const out = { replies: 0, reposts: 0, likes: 0, bookmarks: 0, views: 0 };
  const key = {
    返信: 'replies',
    リポスト: 'reposts',
    いいね: 'likes',
    ブックマーク: 'bookmarks',
    表示: 'views',
  };
  for (const m of label.matchAll(/([\d,.]+)(万?) 件の(返信|リポスト|いいね|ブックマーク|表示)/g)) {
    let n = parseFloat(m[1].replace(/,/g, ''));
    if (m[2]) n *= 10000;
    out[key[m[3]]] = Math.round(n);
  }
  return out;
}

function parseTweets($, capturedAt, titleIndex, unresolved) {
  const records = [];
  // X は絵文字を <img alt="👨‍👩‍👧‍👦"> で描くので、text() だと題から絵文字が抜けて記事に当たらない
  $('[data-testid="tweetText"] img[alt], [data-testid="card.wrapper"] img[alt]').each((_, img) => {
    const alt = $(img).attr('alt');
    if (/^[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\u200d\ufe0f]+$/u.test(alt))
      $(img).replaceWith(alt);
  });
  $('article[data-testid="tweet"]').each((_, el) => {
    const $a = $(el);
    const statusHref = $a
      .find('a[href*="/status/"]')
      .map((_, e) => $(e).attr('href'))
      .get()
      .find((h) => /^(https:\/\/x\.com)?\/[^/]+\/status\/\d+$/.test(h));
    if (!statusHref) return;
    const [, author, id] = statusHref.match(/\/([^/]+)\/status\/(\d+)$/);

    const group = $a.find('[role="group"][aria-label]').first().attr('aria-label') || '';
    const metrics = parseMetrics(group);

    const $text = $a.find('[data-testid="tweetText"]').first();
    const text = $text.text();
    const $card = $a.find('[data-testid="card.wrapper"]').first();
    const cardText = $card.text();
    // カードの先頭はドメイン、その後に題と説明が空白なしで続く
    const cardTitle = (() => {
      const body = cardText.replace(/^future-architect\.github\.io/, '');
      const m = body.match(/^(.*? \| フューチャー技術ブログ)/);
      return m ? m[1] : body || null;
    })();

    const tco =
      $card.find('a[href^="https://t.co/"]').attr('href') ||
      $text.find('a[href^="https://t.co/"]').attr('href') ||
      null;
    let article = null;
    const fromUrl = (text + ' ' + cardText).match(ARTICLE_RE);
    if (fromUrl) article = fromUrl[1];
    else if (cardTitle) article = titleIndex.get(normalize(cardTitle)) || null;
    if (!article) unresolved.push({ id, cardTitle, tco });

    records.push({
      id,
      date: $a.find('time').first().attr('datetime'),
      official: author === OFFICIAL,
      article,
      ...(article ? {} : { tco }),
      ...metrics,
      capturedAt,
    });
  });
  return records;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('usage: node x_mentions_import.mjs <html or dir>...');
    process.exit(2);
  }
  const titleIndex = await loadTitleIndex();

  const existing = new Map();
  try {
    for (const r of JSON.parse(await readFile(OUT, 'utf-8'))) existing.set(r.id, r);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const before = existing.size;

  const unresolved = [];
  let seen = 0;
  for (const file of await listHtml(args)) {
    const capturedAt = (await stat(file)).mtime.toISOString();
    const $ = cheerio.load(await readFile(file, 'utf-8'));
    const records = parseTweets($, capturedAt, titleIndex, unresolved);
    seen += records.length;
    for (const r of records) {
      const old = existing.get(r.id);
      if (!old || old.capturedAt <= r.capturedAt) existing.set(r.id, r);
    }
    console.error(`${path.basename(file)}: ${records.length} posts`);
  }

  const out = [...existing.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
  await writeFile(OUT, JSON.stringify(out, null, 2) + '\n');
  console.error(`read ${seen}, ${before} -> ${out.length} posts in ${OUT}`);
  if (unresolved.length) {
    console.error(`unresolved (${unresolved.length}):`);
    for (const u of unresolved) console.error(`  ${u.id} ${u.tco} ${u.cardTitle ?? '(no card)'}`);
  }
}

await main();
