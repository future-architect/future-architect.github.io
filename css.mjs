// CSS だけを public/css/site.css に書き出す開発用スクリプト（make css）。
//
// hexo generate は何も変えていなくても1分半以上かかる（記事1,449本ぶんの
// 処理が毎回走るため。書き出し0ファイルでも同じ）。CSS の見た目を確かめる
// だけならページの再生成は要らないので、連結済みの CSS を直接置き換える。
//
// 連結そのものは公開ビルド（scripts/combine_css.js）と同じ
// scripts/lib/site_css.js を呼ぶ。
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { combineCss } = require('./scripts/lib/site_css');

const root = dirname(fileURLToPath(import.meta.url));
const srcDir = join(root, 'themes/future/css-src');
const combined = combineCss((name) => readFileSync(join(srcDir, name), 'utf8'));

const out = join(root, 'public/css/site.css');
// public/ は gitignore されているので、まっさらな checkout には無い。
// CI（css ワークフロー）が ENOENT で落ちた
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, combined);
console.log(`${out} (${Math.round(combined.length / 1024)}KB)`);
