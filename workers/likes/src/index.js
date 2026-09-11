// 記事IDは source/_posts/<年>/YYYYMMDD<postid>_*.md の YYYYMMDD + a,b,c…
const POSTID = /^20\d{6}[a-z]?$/;

// 同じ端末から同じ記事へ入れられるのは24時間で3つまで（#1949。Medium の拍手と同じ形）
const SEEN_TTL = 60 * 60 * 24;
const MAX_PER_READER = 3;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(env, origin) });
    }
    if (request.method === 'POST' && url.pathname.startsWith('/like/')) {
      return like(request, env, url.pathname.slice('/like/'.length), origin, url);
    }
    if (request.method === 'POST' && url.pathname.startsWith('/unlike/')) {
      return unlike(request, env, url.pathname.slice('/unlike/'.length), origin);
    }
    if (request.method === 'GET' && url.pathname === '/dump') {
      return dump(request, env);
    }
    return new Response('Not Found', { status: 404 });
  },
};

// 読者が何個入れているかは seen: が持つ（生の IP ではなくハッシュ）。
// 連打ぶんはクライアントがまとめて送ってくるので、KV への書き込みは
// 読者ひとりにつき2回で済む（無料枠は1日1000）
async function like(request, env, postid, origin, url) {
  if (!allowedOrigin(env, origin)) {
    return json({ error: 'forbidden' }, 403, env, origin);
  }
  // Worker は記事の一覧を知らないので形式だけを見る。存在しない記事IDが書けてしまうが、
  // ダンプを取り込む側が実在する記事だけを拾うので表示には出ない
  if (!POSTID.test(postid)) {
    return json({ error: 'bad postid' }, 400, env, origin);
  }

  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  if (env.RATE_LIMITER) {
    const { success } = await env.RATE_LIMITER.limit({ key: ip });
    if (!success) return json({ error: 'too many requests' }, 429, env, origin);
  }

  const countKey = `like:${postid}`;
  const seenKey = `seen:${await fingerprint(env, ip, postid)}`;
  const mine = Number(await env.LIKES.get(seenKey)) || 0;
  const current = Number(await env.LIKES.get(countKey)) || 0;

  const want = Math.min(MAX_PER_READER, Math.max(1, Number(url.searchParams.get('n')) || 1));
  const add = Math.min(want, MAX_PER_READER - mine);
  if (add <= 0) {
    return json({ postid, likes: current, mine }, 200, env, origin);
  }

  const next = current + add;
  // 数を metadata にも持つ。ダンプは list() の metadata から読むので、
  // 記事数ぶんの get を撃たずに済む（Workers 無料枠は1リクエスト50サブリクエストまで）
  await env.LIKES.put(countKey, String(next), { metadata: { n: next } });
  await env.LIKES.put(seenKey, String(mine + add), { expirationTtl: SEEN_TTL });

  return json({ postid, likes: next, mine: mine + add }, 200, env, origin);
}

// 取り消し。読者が入れたぶんだけ引いて、記録も消す
async function unlike(request, env, postid, origin) {
  if (!allowedOrigin(env, origin)) {
    return json({ error: 'forbidden' }, 403, env, origin);
  }
  if (!POSTID.test(postid)) {
    return json({ error: 'bad postid' }, 400, env, origin);
  }

  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  const countKey = `like:${postid}`;
  const seenKey = `seen:${await fingerprint(env, ip, postid)}`;
  const mine = Number(await env.LIKES.get(seenKey)) || 0;
  const current = Number(await env.LIKES.get(countKey)) || 0;
  if (mine <= 0) {
    return json({ postid, likes: current, mine: 0 }, 200, env, origin);
  }

  const next = Math.max(0, current - mine);
  await env.LIKES.put(countKey, String(next), { metadata: { n: next } });
  await env.LIKES.delete(seenKey);

  return json({ postid, likes: next, mine: 0 }, 200, env, origin);
}

async function dump(request, env) {
  if (!env.DUMP_TOKEN || request.headers.get('Authorization') !== `Bearer ${env.DUMP_TOKEN}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const likes = {};
  let cursor;
  do {
    const page = await env.LIKES.list({ prefix: 'like:', limit: 1000, cursor });
    for (const key of page.keys) {
      likes[key.name.slice('like:'.length)] = key.metadata?.n ?? 0;
    }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);

  return new Response(JSON.stringify({ likes }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// 生の IP は保存しない。記事ごとに別のハッシュになるので、鍵が漏れても
// 「どの端末がどの記事を押したか」の突き合わせにしか使えない
async function fingerprint(env, ip, postid) {
  const data = new TextEncoder().encode(`${env.IP_SALT || 'dev'}:${ip}:${postid}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function allowedOrigin(env, origin) {
  return Boolean(origin) && env.ALLOWED_ORIGINS.split(',').includes(origin);
}

function cors(env, origin) {
  if (!allowedOrigin(env, origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(body, status, env, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(env, origin) },
  });
}
