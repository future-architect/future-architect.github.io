'use strict';

/**
 * mermaid の図をビルド時に SVG へ変換する。
 *
 * 以前は hexo-mermaid-lastest が ```mermaid を <pre class="mermaid"> に置き換え、
 * CDN から mermaid.js を読んで読者のブラウザで描画していた。Lighthouse では
 * スクリプトの実行に 1,261ms、転送に 233KB / 27リクエストかかっていた。
 *
 * 変換には Rust 製の mmdr（mermaid-rs-renderer）を使う。
 * mermaid-cli は puppeteer 経由で Chromium を要求するが、mmdr は依存のない
 * 単一バイナリで、CI でも tarball を展開するだけで入る。
 * 記事の全47図のうち46図が描画でき、日本語の字幅も全角1文字=1em で正確。
 * foreignObject ではなく <text> を出すため、読者側で再レイアウトされない。
 *
 * mmdr が無い環境や、描画に失敗した図は従来どおり CDN 描画にフォールバックする。
 * 手元に mmdr を入れていなくてもサイトは壊れない。
 *
 *   curl -sL https://github.com/1jehuang/mermaid-rs-renderer/releases/download/v0.3.1/mmdr-x86_64-unknown-linux-gnu.tar.gz | tar xz
 */

const {execFileSync} = require('child_process');

const MMDR = process.env.MMDR_BIN || 'mmdr';
const FENCE = /^([ \t]*)```mermaid[ \t]*\n([\s\S]*?)\n[ \t]*```/gm;
const CDN_SCRIPT = `\n\n<script type="module"> import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.esm.min.mjs';\tmermaid.initialize({startOnLoad: true, flowchart: {curve: 'linear'}}); </script>`;

// SVG は before_post_render で作り、after_post_render で差し込む。
// Markdown レンダラに素の SVG を通すと壊される恐れがあるため、
// いったん目印だけ置いて、HTML になってから中身と入れ替える
const pending = new Map();
let seq = 0;

let available = null;
function mmdrAvailable(log) {
  if (available !== null) return available;
  try {
    execFileSync(MMDR, ['--version'], {stdio: 'ignore'});
    available = true;
  } catch (e) {
    available = false;
    log.warn('mmdr が見つからないため mermaid はブラウザ側で描画します（ビルド時SVG化は無効）');
  }
  return available;
}

function toSvg(source) {
  const svg = execFileSync(MMDR, ['-i', '-'], {
    input: source,
    maxBuffer: 32 * 1024 * 1024,
    timeout: 30 * 1000
  }).toString();
  if (!svg.includes('<svg')) throw new Error('SVG が返らなかった');

  // 記事幅に収める。mmdr は実寸の width / height を持つが、
  // viewBox があるので幅を外しても縦横比は保たれる
  return svg
    .replace(/^\s+|\s+$/g, '')
    .replace(/<svg\b([^>]*)>/, (tag, attrs) => {
      const cleaned = attrs.replace(/\s(width|height)="[^"]*"/g, '');
      return `<svg${cleaned} class="mermaid-svg">`;
    });
}

hexo.extend.filter.register('before_post_render', function(data) {
  if (data.content.indexOf('```mermaid') === -1) return;

  const log = this.log;
  let fallback = false;

  data.content = data.content.replace(FENCE, (match, indent, source) => {
    if (mmdrAvailable(log)) {
      try {
        const id = `mermaid-svg-${seq++}`;
        pending.set(id, toSvg(source));
        return `${indent}<div class="mermaid-figure" data-mermaid="${id}"></div>`;
      } catch (e) {
        // 1図だけ失敗しても記事全体は出したいので、その図だけCDN描画に落とす
        log.warn(`mermaid の SVG 化に失敗したためブラウザ描画に落とします: ${data.source}\n  ${String(e.message).split('\n')[0]}`);
      }
    }
    fallback = true;
    return `${indent}<pre class="mermaid">${source}</pre>`;
  });

  // CDN のスクリプトは、ブラウザ描画に落ちた図がある記事にだけ足す
  if (fallback) data.content += CDN_SCRIPT;
}, 9);

hexo.extend.filter.register('after_post_render', function(data) {
  if (data.content.indexOf('data-mermaid=') === -1) return;

  data.content = data.content.replace(
    /<div class="mermaid-figure" data-mermaid="([^"]+)"><\/div>/g,
    (match, id) => {
      const svg = pending.get(id);
      if (!svg) return match;
      pending.delete(id);
      return `<div class="mermaid-figure">${svg}</div>`;
    }
  );
});
