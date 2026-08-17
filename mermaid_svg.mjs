/**
 * mermaid 図のSVGキャッシュ生成（#1955）。ローカル専用で、CIでは実行しない。
 *
 * source/_posts の ```mermaid フェンスを抽出し、ソースの SHA-256 をキーに
 * source/_mermaid/<hash>.svg として保存する。生成済みハッシュはスキップするので、
 * 図を編集・追加したときだけ kroki を叩く。参照されなくなった SVG は削除する。
 *
 * レンダラはセルフホストの kroki（mermaid_svg.compose.yml）。未起動なら
 * docker compose で自動起動する。生成後も起動したままにする（停止は
 * `docker compose -f mermaid_svg.compose.yml down`）。
 *
 * 実行: make mermaid（= node mermaid_svg.mjs）
 */

import { createRequire } from 'node:module';
import { readdir, readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { fenceRegExp, hashOf, toKrokiSource, CACHE_DIR } = require('./scripts/lib/mermaid.js');

const ROOT = path.dirname(fileURLToPath(import.meta.url));
// 記事だけでなく固定ページも見る。記法ガイド（/specials/markdown/）が図の見本を
// 持つため。対象から漏れると SVG が作られず、CDN の mermaid.js へ黙って
// フォールバックする（描画はされるので気づけない）(#2533)
const SOURCE_DIRS = [path.join(ROOT, 'source', '_posts'), path.join(ROOT, 'source', 'specials')];
const COMPOSE_FILE = path.join(ROOT, 'mermaid_svg.compose.yml');
const KROKI_URL = process.env.KROKI_URL || 'http://127.0.0.1:8006';
const CONCURRENCY = 4;

async function listFiles(dir, ext) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(ext))
    .map((e) => path.join(e.parentPath, e.name));
}

/** 全記事・固定ページから ```mermaid フェンスを集める。戻り値: Map<hash, {source, files}> */
async function collectDiagrams() {
  const diagrams = new Map();
  const files = (await Promise.all(SOURCE_DIRS.map((dir) => listFiles(dir, '.md')))).flat();
  for (const file of files) {
    const content = await readFile(file, 'utf8');
    for (const m of content.matchAll(fenceRegExp())) {
      const source = m[4];
      const hash = hashOf(source);
      const entry = diagrams.get(hash) || { source, files: [] };
      entry.files.push(path.relative(ROOT, file));
      diagrams.set(hash, entry);
    }
  }
  return diagrams;
}

async function krokiIsUp() {
  try {
    const res = await fetch(`${KROKI_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureKroki() {
  if (await krokiIsUp()) return;
  console.log(`kroki (${KROKI_URL}) が未起動のため docker compose で起動します`);
  execFileSync('docker', ['compose', '-f', COMPOSE_FILE, 'up', '-d'], { stdio: 'inherit' });
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    if (await krokiIsUp()) return;
  }
  throw new Error(
    `kroki が ${KROKI_URL} で起動しない。docker compose -f ${COMPOSE_FILE} logs を確認`,
  );
}

/**
 * SVG 内の id を図ごとに一意化する。
 * mermaid は <style> やマーカー参照を SVG の id でスコープするため、
 * 同一ページに複数の図を並べたとき id が衝突すると互いのスタイルを汚染する。
 */
function uniquifyIds(svg, hash) {
  const m = svg.match(/<svg\b[^>]*?\sid="([^"]+)"/);
  if (!m) return svg;
  const oldId = m[1];
  const newId = `mermaid-${hash.slice(0, 12)}`;
  if (oldId === newId) return svg;
  // ラベル本文に同じ文字列が現れても壊さないよう、id の参照形に限定して置換する
  return svg.replaceAll(`id="${oldId}`, `id="${newId}`).replaceAll(`#${oldId}`, `#${newId}`);
}

async function render(hash, entry) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${KROKI_URL}/mermaid/svg`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: toKrokiSource(entry.source),
        signal: AbortSignal.timeout(60000),
      });
      const body = await res.text();
      if (!res.ok) {
        // 図のソース起因（構文エラー等）はリトライしても無駄
        throw Object.assign(new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`), {
          fatal: res.status < 500,
        });
      }
      return uniquifyIds(body.trim(), hash);
    } catch (e) {
      lastError = e;
      if (e.fatal) break;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error(
    `${entry.files.join(', ')} の図 (${hash.slice(0, 12)}) の生成に失敗: ${lastError.message}`,
  );
}

async function mapLimit(items, limit, fn) {
  const results = [];
  let index = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (index < items.length) {
        const i = index++;
        results[i] = await fn(items[i]).then(
          (value) => ({ value }),
          (error) => ({ error }),
        );
      }
    }),
  );
  return results;
}

const diagrams = await collectDiagrams();
await mkdir(CACHE_DIR, { recursive: true });
const cached = new Set((await listFiles(CACHE_DIR, '.svg')).map((f) => path.basename(f, '.svg')));

const missing = [...diagrams.keys()].filter((hash) => !cached.has(hash));
const orphans = [...cached].filter((hash) => !diagrams.has(hash));
console.log(
  `図 ${diagrams.size} 件 / 生成済み ${diagrams.size - missing.length} 件 / 未生成 ${missing.length} 件 / 不要 ${orphans.length} 件`,
);

if (missing.length > 0) {
  await ensureKroki();
}

let failed = 0;
const results = await mapLimit(missing, CONCURRENCY, async (hash) => {
  const svg = await render(hash, diagrams.get(hash));
  await writeFile(path.join(CACHE_DIR, `${hash}.svg`), svg + '\n');
  console.log(`生成: ${hash.slice(0, 12)} (${diagrams.get(hash).files[0]})`);
});
for (const r of results) {
  if (r.error) {
    failed++;
    console.error(r.error.message);
  }
}

for (const hash of orphans) {
  await unlink(path.join(CACHE_DIR, `${hash}.svg`));
  console.log(`削除: ${hash.slice(0, 12)}（参照する記事が無い）`);
}

if (failed > 0) {
  console.error(`${failed} 件の生成に失敗（失敗した図はブラウザ描画のフォールバックで表示される）`);
  process.exitCode = 1;
}
