// サイトのアクセシビリティ・情報設計の実測。ローカルサーバを代表ページ分だけ巡回する
//
// エラー（exit 1）: axe の critical/serious、h1 の不在・複数、main の不在、
//   横スクロール、alt 無しの img、名前の無いリンク、タブ順に残る aria-hidden
// 警告: axe の moderate/minor、見出しレベルの飛び、width/height 無しの img、
//   24px 未満の的、フォーカスの輪郭が出ない要素、title / description の長さ
// 情報: 本文1行の字数、スキップリンクから本文までのタブ停止数、コンソールエラー
//
// 実行: node .claude/skills/site-audit/audit.mjs --shots /tmp/shots
// 依存は リポジトリ外（~/.cache/site-audit）に置く。ブログ本体の package.json は汚さない
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ---- 引数 ----
let lastFlag = null;
// --shots の値も絶対パスなので、位置引数は「フラグの値ではないもの」として拾う
const opts = {};
const rest = [];
for (const a of process.argv.slice(2)) {
  const m = a.match(/^--([\w-]+)(?:=(.*))?$/);
  if (m) { opts[m[1]] = m[2] === undefined ? true : m[2]; lastFlag = m[2] === undefined ? m[1] : null; continue; }
  if (lastFlag) { opts[lastFlag] = a; lastFlag = null; continue; }
  rest.push(a);
}
const flag = (name, def) => (opts[name] === undefined || opts[name] === true ? def : opts[name]);
const BASE = flag('base', 'http://localhost:4000').replace(/\/$/, '');
const WIDTHS = flag('widths', '375,768,1280').split(',').map(Number);
const SHOTS = flag('shots', null);
const JSON_OUT = flag('json', null);
const ONLY = rest.filter(a => a.startsWith('/'));

// ---- 依存の解決 ----
// リポジトリに playwright を入れていないので、キャッシュ側から読む。
// SITE_AUDIT_DEPS で差し替え可。無ければ SKILL.md の導入コマンドを案内して止まる
const depsDir = process.env.SITE_AUDIT_DEPS
  || path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'site-audit', 'node_modules');
let chromium, axePath;
// playwright は CJS なので、名前付き export が立たない環境では default から取る
const pick = mod => mod.chromium || (mod.default && mod.default.chromium);
try {
  chromium = pick(await import(path.join(depsDir, 'playwright', 'index.js')));
  axePath = path.join(depsDir, 'axe-core', 'axe.min.js');
  if (!chromium || !fs.existsSync(axePath)) throw new Error('依存が揃っていない');
} catch {
  try {
    chromium = pick(await import('playwright'));
    axePath = new URL(import.meta.resolve('axe-core/axe.min.js')).pathname;
    if (!chromium) throw new Error('playwright が無い');
  } catch {
    console.error(`依存が見つからない（探した場所: ${depsDir}）。以下で用意する:

  mkdir -p ~/.cache/site-audit && cd ~/.cache/site-audit && npm init -y
  npm install playwright axe-core
  npx playwright install chromium
  sudo env "PATH=$PATH" npx playwright install-deps chromium`);
    process.exit(2);
  }
}

// ---- 巡回するページ ----
// ページ種を1枚ずつ。全件を回すのではなく「レイアウトの種類」を網羅する
const PAGES = [
  ['/', 'トップ'],
  ['/articles/', 'アーカイブ'],
  ['/categories/', 'カテゴリ索引'],
  ['/categories/Programming/', 'カテゴリ個別'],
  ['/tags/', 'タグ索引'],
  ['/tags/Go/', 'タグ個別'],
  ['/authors/', '著者索引'],
  ['/series/', '連載一覧'],
  ['/specials/styleguide/', 'スタイルガイド'],
  ['/specials/markdown/', '特設（Markdown）'],
];

const findings = new Map(); // 「重大度|見出し」 -> {pages:Set, samples:[]}
const add = (sev, title, where, sample) => {
  const key = `${sev}|${title}`;
  if (!findings.has(key)) findings.set(key, {sev, title, pages: new Set(), samples: []});
  const f = findings.get(key);
  f.pages.add(where);
  if (sample && f.samples.length < 3 && !f.samples.includes(sample)) f.samples.push(sample);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({viewport: {width: WIDTHS.at(-1), height: 900}, deviceScaleFactor: 1});
const page = await ctx.newPage();
page.setDefaultTimeout(30000);

// ---- 最新記事と著者ページはトップから辿る（固定で書くと古くなる）----
const targets = ONLY.length ? ONLY.map(u => [u, u]) : [...PAGES];
if (!ONLY.length) {
  try {
    await page.goto(`${BASE}/`, {waitUntil: 'domcontentloaded'});
    const post = await page.getAttribute('a[href*="/articles/20"]', 'href');
    if (post) {
      targets.push([new URL(post, BASE).pathname, '記事']);
      await page.goto(new URL(post, BASE).href, {waitUntil: 'domcontentloaded'});
      const author = await page.getAttribute('a[href*="/authors/"]', 'href');
      if (author) targets.push([new URL(author, BASE).pathname, '著者個別']);
    }
  } catch (e) {
    console.error(`[ERROR] ${BASE}/ を開けない（make s でサーバを起動しているか）: ${e.message.split('\n')[0]}`);
    await browser.close();
    process.exit(2);
  }
}

// ---- ページ内で測る（ブラウザ側）----
const inspect = () => {
  const vis = el => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    if (r.width <= 0 || r.height <= 0 || s.visibility === 'hidden' || s.display === 'none') return false;
    // aria-hidden の中は支援技術に出ないので名前も alt も求めない（サムネの重複リンク #2845 がこの形）
    return !el.closest('[aria-hidden="true"]');
  };
  const label = el => (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim();
  const brief = el => {
    const id = el.id ? `#${el.id}` : '';
    const cls = el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/)[0]}` : '';
    return `${el.tagName.toLowerCase()}${id}${cls}`;
  };

  // 見出し
  const heads = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(vis)
    .map(h => ({lv: +h.tagName[1], text: label(h), el: brief(h)}));

  // 画像
  const imgs = [...document.querySelectorAll('img')].filter(vis).map(i => ({
    src: (i.getAttribute('src') || '').split('/').pop(),
    hasAlt: i.hasAttribute('alt'),
    alt: i.getAttribute('alt') || '',
    dim: i.hasAttribute('width') && i.hasAttribute('height'),
    lazy: i.getAttribute('loading') === 'lazy',
  }));

  // リンク
  const AMBIGUOUS = /^(こちら|ここ|リンク|詳細|詳しくはこちら|こちらから|more|read more|click here|here|続き)$/i;
  const links = [...document.querySelectorAll('a')].filter(vis).map(a => {
    const imgs = [...a.querySelectorAll('img')];
    return {
      href: a.getAttribute('href') || '',
      text: label(a),
      title: a.getAttribute('title') || '',
      imgAlt: imgs.map(i => i.getAttribute('alt') || '').join(''),
      // 中身が飾りの画像だけ（alt=""）のリンク。隣のテキストが名乗る前提の形
      decorativeOnly: imgs.length > 0 && imgs.every(i => i.getAttribute('alt') === ''),
      blank: a.getAttribute('target') === '_blank',
      rel: a.getAttribute('rel') || '',
      el: brief(a),
    };
  });
  // title は読み上げの最後の砦なので名前として数える（axe の link-name と同じ扱い）
  const noName = links.filter(a => !a.text && !a.imgAlt && !a.title);
  // #2845: サムネとタイトルが同じ行き先を指すカードは、サムネ側をタブ順と読み上げから外す
  const thumbInTabOrder = links.filter(a => !a.text && a.decorativeOnly && a.href);
  const ambiguous = links.filter(a => AMBIGUOUS.test(a.text));
  const blankNoRel = links.filter(a => a.blank && !/noopener|noreferrer/.test(a.rel));
  // 同じ文字で行き先が違うリンク（読み上げでは区別できない）
  const byText = new Map();
  for (const a of links) {
    if (!a.text || !a.href) continue;
    if (!byText.has(a.text)) byText.set(a.text, new Set());
    byText.get(a.text).add(a.href);
  }
  const sameTextDiffHref = [...byText.entries()].filter(([, s]) => s.size > 1).map(([t, s]) => `${t}（${s.size}箇所）`);

  // 横方向のはみ出し
  const vw = document.documentElement.clientWidth;
  const overflow = document.documentElement.scrollWidth > vw + 1
    ? [...document.querySelectorAll('body *')].filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > vw + 1 || r.left < -1) && getComputedStyle(el).position !== 'fixed';
      }).slice(0, 3).map(brief)
    : [];

  // 本文1行の字数（CLAUDE.md がモバイルの字数で議論しているので同じ単位で出す）
  let column = null;
  const p = [...document.querySelectorAll('.article-entry p, .specials-text p, .lede')].find(el => vis(el) && el.getBoundingClientRect().width > 100);
  if (p) {
    const fs = parseFloat(getComputedStyle(p).fontSize);
    const w = p.getBoundingClientRect().width;
    column = {chars: +(w / fs).toFixed(1), colWidth: Math.round(w), fontSize: +fs.toFixed(1)};
  }

  // ランドマークとメタ
  const navs = [...document.querySelectorAll('nav')].filter(vis);
  // 着地点は #main。テーマは <main> の内側に <section id="main"> を置くので、
  // main 要素で拾うと tabindex を持たない外側が当たる
  const skip = document.querySelector('#main');
  const meta = n => (document.querySelector(`meta[name="${n}"]`) || {}).content || '';
  const og = n => (document.querySelector(`meta[property="og:${n}"]`) || {}).content || '';

  return {
    heads, imgs,
    linkCount: links.length,
    noName: noName.map(a => `${a.el} href=${a.href}`),
    thumbInTabOrder: thumbInTabOrder.map(a => `${a.el} href=${a.href}`),
    ambiguous: ambiguous.map(a => `「${a.text}」→ ${a.href}`),
    blankNoRel: blankNoRel.map(a => a.href),
    sameTextDiffHref,
    overflow, column,
    landmarks: {
      skip: !!skip,
      skipTag: skip ? skip.tagName.toLowerCase() : '',
      skipTabindex: skip ? skip.getAttribute('tabindex') : null,
      main: !!document.querySelector('main'),
      header: !!document.querySelector('header'),
      footer: !!document.querySelector('footer'),
      navs: navs.length,
      navsUnlabeled: navs.filter(n => !n.getAttribute('aria-label') && !n.getAttribute('aria-labelledby')).length,
    },
    meta: {
      lang: document.documentElement.lang,
      title: (document.title || '').trim(),
      description: meta('description'),
      canonical: !!document.querySelector('link[rel="canonical"]'),
      ogTitle: !!og('title'),
      ogImage: !!og('image'),
    },
  };
};

// ---- キーボードでタブ順を辿る ----
const tabWalk = async (page, limit = 45) => {
  await page.evaluate(() => {
    document.body.focus();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  });
  const stops = [];
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press('Tab');
    const s = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const st = getComputedStyle(el);
      const ring = (st.outlineStyle !== 'none' && parseFloat(st.outlineWidth) > 0) || st.boxShadow !== 'none';
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        text: (el.getAttribute('aria-label') || el.textContent || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 30),
        href: el.getAttribute('href') || '',
        ring,
        hidden: !!el.closest('[aria-hidden="true"]'),
        offscreen: r.width === 0 && r.height === 0,
        inMain: !!el.closest('main, #main'),
        el: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/)[0]}` : ''),
      };
    });
    if (!s) break;
    stops.push(s);
    if (s.inMain) break;
  }
  return stops;
};

// ---- 巡回 ----
const console_errors = [];
// ローカルでは外部の計測タグが必ず落ちる。サイト自身の不具合と混ざるので除く
const THIRD_PARTY = /google-analytics|googletagmanager|doubleclick|google\.com\/ads|b\.hatena|platform\.twitter|connect\.facebook|feedly|youtube/;
page.on('console', m => { if (m.type() === 'error' && !THIRD_PARTY.test(m.text())) console_errors.push(m.text().slice(0, 160)); });
page.on('requestfailed', r => { if (!THIRD_PARTY.test(r.url())) console_errors.push(`request failed: ${r.url().slice(0, 120)}`); });
const columns = [];
const walks = [];
// 転送量。Content-Length があるときだけ数える（無ければ 0 のまま出さない）
let weight = {total: 0, img: 0, imgCount: 0, css: 0, js: 0, font: 0, heavy: []};
page.on('response', res => {
  const len = +(res.headers()['content-length'] || 0);
  if (!len) return;
  const t = res.request().resourceType();
  weight.total += len;
  if (t === 'image') {
    weight.img += len; weight.imgCount++;
    if (len > 300 * 1024) weight.heavy.push(`${res.url().split('/').pop()} ${Math.round(len / 1024)}KB`);
  } else if (t === 'stylesheet') weight.css += len;
  else if (t === 'script') weight.js += len;
  else if (t === 'font') weight.font += len;
});
if (SHOTS) fs.mkdirSync(SHOTS, {recursive: true});

for (const [urlPath, name] of targets) {
  for (const width of WIDTHS) {
    await page.setViewportSize({width, height: 900});
    const where = `${name}@${width}`;
    console_errors.length = 0;
    weight = {total: 0, img: 0, imgCount: 0, css: 0, js: 0, font: 0, heavy: []};
    let res;
    try {
      res = await page.goto(`${BASE}${urlPath}`, {waitUntil: 'load'});
    } catch (e) {
      add('WARN', `ページを開けない: ${urlPath}`, where, e.message.split('\n')[0]);
      continue;
    }
    if (!res || res.status() >= 400) {
      add('WARN', `ページが ${res ? res.status() : '不明'}: ${urlPath}`, where, 'ビルドし直すか、巡回対象から外す');
      continue;
    }

    // フェードの途中で測ると、色が地に混ざってコントラスト不足に見える
    // （CSS だけのタブ #2852 の .tab_content が opacity 0.47 で通過する）
    await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running'), {timeout: 3000}).catch(() => {});

    // axe（幅で結果が変わる rule があるので幅ごとに回す）
    await page.addScriptTag({path: axePath});
    const axe = await page.evaluate(() => window.axe.run(document, {
      resultTypes: ['violations'],
      runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']},
    }));
    for (const v of axe.violations) {
      const sev = v.impact === 'critical' || v.impact === 'serious' ? 'ERROR' : 'WARN';
      add(sev, `axe ${v.id}（${v.impact}）: ${v.help}`, where,
        `${v.nodes.length}件 例: ${(v.nodes[0].target || []).join(' ')} — ${v.nodes[0].failureSummary ? v.nodes[0].failureSummary.split('\n').slice(1).join(' / ').slice(0, 120) : ''}`);
    }

    const r = await page.evaluate(inspect);

    // 見出し
    const h1 = r.heads.filter(h => h.lv === 1);
    if (h1.length === 0) add('ERROR', 'h1 が無い', where, r.heads.slice(0, 2).map(h => `h${h.lv} ${h.text.slice(0, 20)}`).join(' / '));
    if (h1.length > 1) add('ERROR', `h1 が ${h1.length} 個`, where, h1.map(h => h.text.slice(0, 20)).join(' / '));
    for (let i = 1; i < r.heads.length; i++) {
      const d = r.heads[i].lv - r.heads[i - 1].lv;
      if (d > 1) add('WARN', `見出しレベルの飛び h${r.heads[i - 1].lv} → h${r.heads[i].lv}`, where, `${r.heads[i].el}「${r.heads[i].text.slice(0, 24)}」`);
    }
    for (const h of r.heads) if (!h.text) add('WARN', '中身の無い見出し', where, h.el);

    // 画像
    const noAlt = r.imgs.filter(i => !i.hasAlt);
    if (noAlt.length) add('ERROR', `alt 属性の無い img が ${noAlt.length} 件`, where, noAlt.slice(0, 3).map(i => i.src).join(' / '));
    const noDim = r.imgs.filter(i => !i.dim);
    if (noDim.length) add('WARN', `width/height の無い img が ${noDim.length} 件（読み込み中に段が飛ぶ）`, where, noDim.slice(0, 3).map(i => i.src).join(' / '));

    // リンク
    if (r.noName.length) add('ERROR', `読み上げる名前が無いリンク ${r.noName.length} 件`, where, r.noName.slice(0, 3).join(' / '));
    if (r.thumbInTabOrder.length) add('WARN', `サムネのリンクがタブ順に残っている ${r.thumbInTabOrder.length} 件（#2845）`, where, `tabindex="-1" と aria-hidden="true" を付ける: ${r.thumbInTabOrder.slice(0, 3).join(' / ')}`);
    if (r.ambiguous.length) add('WARN', `リンクテキストだけでは行き先が分からない ${r.ambiguous.length} 件`, where, r.ambiguous.slice(0, 3).join(' / '));
    if (r.blankNoRel.length) add('WARN', `target=_blank に rel が無い ${r.blankNoRel.length} 件`, where, r.blankNoRel.slice(0, 2).join(' / '));
    if (r.sameTextDiffHref.length) add('INFO', `同じ文字で行き先が違うリンク ${r.sameTextDiffHref.length} 種`, where, r.sameTextDiffHref.slice(0, 3).join(' / '));

    // はみ出し
    if (r.overflow.length) add('ERROR', '横スクロールが出ている', where, `はみ出し: ${r.overflow.join(' / ')}`);

    // ランドマーク
    const L = r.landmarks;
    if (!L.skip) add('ERROR', 'id="main" が無い（スキップリンクの着地点）', where, '新しいレイアウトを足したら付ける（#2846）');
    else if (L.skipTabindex !== '-1') add('ERROR', '#main に tabindex="-1" が無い（#2846）', where, `<${L.skipTag} id="main">`);
    if (!L.main) add('WARN', 'main 要素が無い', where);
    if (!L.header) add('WARN', 'header 要素が無い', where);
    if (!L.footer) add('WARN', 'footer 要素が無い', where);
    if (L.navs > 1 && L.navsUnlabeled) add('WARN', `名前の無い nav が ${L.navsUnlabeled}/${L.navs} 件（何の案内か読み上げられない）`, where);

    // メタ（幅に依らないので最も広い幅でだけ見る）
    if (width === WIDTHS.at(-1)) {
      const m = r.meta;
      if (!m.lang) add('ERROR', 'html に lang が無い', where);
      if (!m.title) add('ERROR', 'title が空', where);
      else if (m.title.length > 60) add('WARN', `title が ${m.title.length} 文字（検索結果で切れる）`, where, m.title.slice(0, 40) + '…');
      if (!m.description) add('WARN', 'meta description が無い', where);
      else if (m.description.length > 130) add('WARN', `meta description が ${m.description.length} 文字`, where, m.description.slice(0, 40) + '…');
      if (!m.canonical) add('INFO', 'canonical が無い', where);
      if (!m.ogTitle || !m.ogImage) add('WARN', `OGP が欠けている（title:${m.ogTitle} image:${m.ogImage}）`, where);
      const t1 = h1[0] && h1[0].text;
      if (t1 && m.title && !m.title.includes(t1.slice(0, 8))) add('INFO', 'title と h1 が食い違う', where, `title:${m.title.slice(0, 30)} / h1:${t1.slice(0, 30)}`);
    }

    if (r.column) columns.push({where, width, ...r.column});
    if (width === WIDTHS.at(-1) && weight.total) {
      const kb = n => Math.round(n / 1024);
      add('INFO', `転送量 ${kb(weight.total)}KB（画像 ${kb(weight.img)}KB / ${weight.imgCount}枚, CSS ${kb(weight.css)}KB, JS ${kb(weight.js)}KB, フォント ${kb(weight.font)}KB）`, where);
      if (weight.total > 1500 * 1024) add('WARN', `1ページで ${kb(weight.total)}KB 読む`, where, `画像が ${kb(weight.img)}KB / ${weight.imgCount}枚`);
      if (weight.heavy.length) add('WARN', `300KB を超える画像 ${weight.heavy.length} 枚`, where, weight.heavy.slice(0, 3).join(' / '));
    }
    if (console_errors.length) add('WARN', `コンソールエラー ${console_errors.length} 件`, where, console_errors.slice(0, 2).join(' / '));

    // キーボード走査は幅で作りが変わる箇所（検索・ナビ）があるので最小と最大の幅で
    if (width === WIDTHS[0] || width === WIDTHS.at(-1)) {
      const stops = await tabWalk(page);
      const reached = !!(stops.at(-1) && stops.at(-1).inMain);
      walks.push({where, stops: stops.length, reached});
      // スキップリンクがあっても、押さずに Tab を送る読者は全部踏む
      if (reached && stops.length > 10) {
        const byClass = new Map();
        for (const s2 of stops.slice(0, -1)) byClass.set(s2.el, (byClass.get(s2.el) || 0) + 1);
        const top = [...byClass.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k}×${v}`).join(' / ');
        add('WARN', `本文まで ${stops.length} 回タブ停止する`, where, `内訳: ${top}`);
      }
      const first = stops[0];
      if (!first) add('ERROR', 'Tab でどこにもフォーカスが移らない', where);
      else {
        if (!/skip|スキップ|本文/.test(`${first.text}${first.el}`)) add('WARN', 'Tab の1つめがスキップリンクでない（#2846）', where, `${first.el}「${first.text}」`);
        for (const s of stops) {
          if (s.hidden) add('ERROR', 'aria-hidden の中がタブ順に残っている', where, `${s.el}「${s.text}」`);
          if (!s.ring && !s.offscreen) add('WARN', 'フォーカスの輪郭が出ない', where, `${s.el}「${s.text}」`);
        }
        for (let i = 1; i < stops.length; i++) {
          if (stops[i].href && stops[i].href === stops[i - 1].href) {
            add('WARN', '同じ行き先で2回タブ停止する（#2845）', where, `${stops[i].href} — ${stops[i - 1].el} / ${stops[i].el}`);
          }
        }
      }
    }

    if (SHOTS) {
      const file = path.join(SHOTS, `${urlPath.replace(/[^\w]+/g, '_').replace(/^_|_$/g, '') || 'top'}-${width}.png`);
      await page.screenshot({path: file, fullPage: false});
    }
  }
}

await browser.close();

// ---- 出力 ----
const order = {ERROR: 0, WARN: 1, INFO: 2};
const list = [...findings.values()].sort((a, b) => order[a.sev] - order[b.sev] || b.pages.size - a.pages.size);
for (const f of list) {
  const pages = [...f.pages];
  const shown = pages.length > 4 ? `${pages.slice(0, 4).join(', ')} 他${pages.length - 4}` : pages.join(', ');
  console.log(`[${f.sev}] ${f.title}`);
  console.log(`        ページ: ${shown}`);
  for (const s of f.samples) console.log(`        例: ${s}`);
}

if (columns.length) {
  console.log('\n本文1行の字数（全角換算）:');
  const seen = new Map();
  for (const c of columns) {
    const key = `${c.width}|${c.chars}`;
    if (!seen.has(key)) seen.set(key, {...c, pages: []});
    seen.get(key).pages.push(c.where.split('@')[0]);
  }
  for (const c of [...seen.values()].sort((a, b) => a.width - b.width)) {
    console.log(`        幅${c.width}: ${c.chars}字（列 ${c.colWidth}px / ${c.fontSize}px）— ${c.pages.slice(0, 3).join(', ')}${c.pages.length > 3 ? ` 他${c.pages.length - 3}` : ''}`);
  }
}
if (walks.length) {
  console.log('\n本文までのタブ停止数:');
  for (const w of walks) console.log(`        ${w.where}: ${w.stops}${w.reached ? '' : '（本文に到達せず）'}`);
}

const n = s => list.filter(f => f.sev === s).length;
console.log(`\nページ ${targets.length} × 幅 ${WIDTHS.join('/')} / エラー ${n('ERROR')} / 警告 ${n('WARN')} / 情報 ${n('INFO')}`);
if (SHOTS) console.log(`スクリーンショット: ${SHOTS}`);
if (JSON_OUT) {
  fs.writeFileSync(JSON_OUT, JSON.stringify({base: BASE, widths: WIDTHS, findings: list.map(f => ({...f, pages: [...f.pages]})), columns, walks}, null, 2));
  console.log(`JSON: ${JSON_OUT}`);
}
process.exit(n('ERROR') ? 1 : 0);
