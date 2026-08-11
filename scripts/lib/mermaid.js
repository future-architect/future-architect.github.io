'use strict';

/**
 * mermaid 図のビルド時SVG化（#1955）の共通定義。
 *
 * フィルタ（scripts/mermaid.js）と生成スクリプト（mermaid_svg.mjs）の間で
 * 抽出パターンとハッシュの定義がズレるとキャッシュが空振りして
 * 全図がフォールバックに落ちるため、ここに集約する。
 */

const crypto = require('crypto');
const path = require('path');
const yaml = require('js-yaml');

// hexo-mermaid-lastest 1.1.1 と同じパターン。置換対象の範囲を変えないため踏襲する
const FENCE_PATTERN = '(\\s*)(```) *(mermaid) *\\n?([\\s\\S]+?)\\s*(\\2)(\\n+|$)';

// source/ 配下だが接頭辞 _ なので hexo は route を生成しない（リポジトリにはコミットする）
const CACHE_DIR = path.join(__dirname, '..', '..', 'source', '_mermaid');

function fenceRegExp() {
  return new RegExp(FENCE_PATTERN, 'g');
}

// SVGキャッシュのキー。図のソースそのものから決まるので、図を編集したときだけ再生成される
function hashOf(source) {
  return crypto.createHash('sha256').update(source, 'utf8').digest('hex');
}

/**
 * kroki に投げるソースを作る。
 *
 * フォールバック側は mermaid.initialize({flowchart: {curve: 'linear'}}) で
 * 描画しているため、同じ curve 設定を frontmatter として注入して見た目を揃える。
 * 図が自前の frontmatter で同じキーを指定している場合はそちらが勝つ
 * （initialize のサイト設定より図側の設定が優先される、という本家の優先順位に合わせる）。
 */
function toKrokiSource(source) {
  const m = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) {
    return `---\nconfig:\n  flowchart:\n    curve: linear\n---\n${source}`;
  }
  let fm;
  try {
    fm = yaml.load(m[1]);
  } catch (e) {
    return source; // frontmatter が壊れている図は手を加えず kroki のエラーに任せる
  }
  if (typeof fm !== 'object' || fm === null) fm = {};
  fm.config = Object.assign({}, fm.config);
  fm.config.flowchart = Object.assign({ curve: 'linear' }, fm.config.flowchart);
  return `---\n${yaml.dump(fm)}---\n${source.slice(m[0].length)}`;
}

module.exports = { fenceRegExp, hashOf, toKrokiSource, CACHE_DIR };
