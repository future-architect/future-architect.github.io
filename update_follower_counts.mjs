// GitHub organization のフォロワー数を source/_data/follower_counts.yml に書き戻す。
// update-cache.yml から毎日実行する (#2841)。
//
// X は同じようには取れない（フォロワー数を返す API が有料）ので手打ちのまま。
// このスクリプトが触るのは github: の2行だけで、手で書いたコメントと x の値は動かさない。
//
// 日付はワークフローが TZ=Asia/Tokyo を立てている前提で、その日のローカル日付を書く。
import { readFile, writeFile } from 'node:fs/promises';

const FILE = 'source/_data/follower_counts.yml';
const API = 'https://api.github.com/users/future-architect';
// organization でも /users/{login} が followers を返す（type は "Organization"）
const SHAPE = /^(github:\n {2}count: )\d+(\n {2}as_of: ')[^']*(')/m;

const headers = { Accept: 'application/vnd.github+json' };
// 未認証だと1時間60回まで。ワークフローの GITHUB_TOKEN を使って余裕を持たせる
if (process.env.GH_TOKEN) headers.Authorization = `Bearer ${process.env.GH_TOKEN}`;

const res = await fetch(API, { headers });
if (!res.ok) throw new Error(`${API} が ${res.status} を返した`);

const { followers } = await res.json();
// 0 や undefined をそのまま書くと、取得に失敗した日に数字が消えたまま公開される
if (!Number.isInteger(followers) || followers <= 0) {
  throw new Error(`followers が正の整数ではない: ${JSON.stringify(followers)}`);
}

const yml = await readFile(FILE, 'utf8');
if (!SHAPE.test(yml)) {
  throw new Error(`${FILE} の github: の形が変わっていて書き換えられない`);
}

// sv-SE は YYYY-MM-DD で返るロケール
const today = new Date().toLocaleDateString('sv-SE');
await writeFile(FILE, yml.replace(SHAPE, `$1${followers}$2${today}$3`));
console.log(`GitHub followers: ${followers} (${today})`);
