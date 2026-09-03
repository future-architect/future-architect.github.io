// フッターに出すフォロワー数を source/_data/follower_counts.yml に書き戻す。
// update-cache.yml から毎日実行する (#2841 / #3193)。
//
// 触るのは github: と youtube: の count / as_of だけで、手で書いたコメントと
// x: / connpass: の値は動かさない（どちらも取りに行く手段が無い。理由は yml のコメント）。
//
// GitHub は落ちたら止める。API が安定していて、失敗はこちらの誤りか障害を意味する。
// YouTube はチャンネルページの JSON-LD から読むので、向こうの HTML の都合で
// 取れなくなりうる。**その日は前の値を残して先へ進む** —— ここで throw すると
// SNS シェア数のコミットごとワークフローが落ちる。数字が古いことは as_of が名乗る。
import { readFile, writeFile } from 'node:fs/promises';

const FILE = 'source/_data/follower_counts.yml';
const CHANNEL = 'https://www.youtube.com/channel/UCJUSwYYd0CkGgmEKAW7QVpw';

// sv-SE は YYYY-MM-DD で返るロケール
const today = new Date().toLocaleDateString('sv-SE');

const shapeOf = (key) => new RegExp(`^(${key}:\\n {2}count: )\\d+(\\n {2}as_of: ')[^']*(')`, 'm');

function assertCount(source, value) {
  // 0 や undefined をそのまま書くと、取得に失敗した日に数字が消えたまま公開される
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${source} が正の整数ではない: ${JSON.stringify(value)}`);
  }
}

async function fetchGitHubFollowers() {
  const api = 'https://api.github.com/users/future-architect';
  const headers = { Accept: 'application/vnd.github+json' };
  // 未認証だと1時間60回まで。ワークフローの GITHUB_TOKEN を使って余裕を持たせる
  if (process.env.GH_TOKEN) headers.Authorization = `Bearer ${process.env.GH_TOKEN}`;

  const res = await fetch(api, { headers });
  if (!res.ok) throw new Error(`${api} が ${res.status} を返した`);
  const { followers } = await res.json();
  assertCount('followers', followers);
  return followers;
}

async function fetchYouTubeSubscribers() {
  const res = await fetch(CHANNEL);
  if (!res.ok) throw new Error(`${CHANNEL} が ${res.status} を返した`);
  const html = await res.text();

  const ld = html.match(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/s);
  if (!ld) throw new Error('チャンネルページに JSON-LD が無い');

  const stats = JSON.parse(ld[1])?.mainEntity?.interactionStatistic ?? [];
  // 再生数など他の InteractionCounter も同じ配列に並ぶので、種別で選ぶ
  const follow = stats.find((s) => s.interactionType?.['@type'] === 'FollowAction');
  if (!follow) throw new Error('JSON-LD に FollowAction が無い');

  const count = Number(follow.userInteractionCount);
  assertCount('userInteractionCount', count);
  return count;
}

let yml = await readFile(FILE, 'utf8');

function put(key, count) {
  const shape = shapeOf(key);
  if (!shape.test(yml)) {
    throw new Error(`${FILE} の ${key}: の形が変わっていて書き換えられない`);
  }
  yml = yml.replace(shape, `$1${count}$2${today}$3`);
  console.log(`${key}: ${count} (${today})`);
}

put('github', await fetchGitHubFollowers());

try {
  put('youtube', await fetchYouTubeSubscribers());
} catch (err) {
  console.warn(`YouTube の登録者数を取れなかったので前の値を残す: ${err.message}`);
}

await writeFile(FILE, yml);
