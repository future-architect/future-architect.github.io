'use strict';

/**
 * mermaid 図をビルド時にSVG化する（#1955）。
 *
 * `make mermaid` が source/_mermaid/<sha256>.svg を生成済みの図は
 * SVG をインライン展開し、ブラウザ側の mermaid.js を不要にする。
 * キャッシュが無い図は従来どおり pre.mermaid + CDN スクリプトで描画する
 * （SVG未生成の新規記事を壊さないためのフォールバック）。
 *
 * 2段階にしている理由:
 * - before_post_render の結果は db.json にキャッシュされ、記事ソースが
 *   変わらない限り再実行されない。ここでキャッシュの有無を見て分岐すると、
 *   SVG を生成しても記事を再編集するまで反映されない
 * - そこで前段はキャッシュ状態に依存しない固定のマークアップだけを出し、
 *   毎ビルド必ず実行される after_render:html で SVG に差し替える
 *
 * プレースホルダは従来と同じ <pre class="mermaid"> に data-mermaid を
 * 足しただけの形にする。<div> 等で包むと Markdown の HTML ブロックが
 * <pre> 特例（空行をまたいで </pre> まで raw 扱い）から外れ、
 * 空行を含む図で閉じタグが失われて後続の本文ごと壊れる。
 */

const fs = require('fs');
const path = require('path');
const {fenceRegExp, hashOf, CACHE_DIR} = require('./lib/mermaid');

// hexo-mermaid-lastest 1.1.1 が付けていたものと同一（フォールバックの挙動を変えない）
const MERMAID_SCRIPT = `<script type="module"> import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.esm.min.mjs';	mermaid.initialize({startOnLoad: true, flowchart: {curve: 'linear'}}); </script>`;

function ignore(data) {
  const source = data.source;
  const ext = source.substring(source.lastIndexOf('.')).toLowerCase();
  return ['.js', '.css', '.html', '.htm'].indexOf(ext) > -1;
}

function readSvg(hash) {
  const file = path.join(CACHE_DIR, `${hash}.svg`);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim() : null;
}

hexo.extend.filter.register('before_post_render', (data) => {
  if (ignore(data)) return;
  let matched = false;
  data.content = data.content.replace(fenceRegExp(), (raw, start, quote, lang, source, endQuote, end) => {
    matched = true;
    return `${start}<pre class="mermaid" data-mermaid="${hashOf(source)}">${source}</pre>${end}`;
  });
  if (matched) {
    data.content += `\n\n${MERMAID_SCRIPT}`;
  }
}, 9);

hexo.extend.filter.register('after_render:html', (str) => {
  if (typeof str !== 'string' || str.indexOf('data-mermaid="') === -1) return str;
  let out = str.replace(
    /<pre class="mermaid" data-mermaid="([0-9a-f]{64})">[\s\S]*?<\/pre>/g,
    (block, hash) => {
      const svg = readSvg(hash);
      if (svg === null) return block; // フォールバック: 従来どおりブラウザで描画
      return `<div class="mermaid-svg" data-mermaid="${hash}">${svg}</div>`;
    }
  );
  // 全図をSVG化できたページでは mermaid.js の読み込み自体が不要になる
  if (out.indexOf('<pre class="mermaid"') === -1) {
    out = out.split(MERMAID_SCRIPT).join('');
  }
  return out;
});
