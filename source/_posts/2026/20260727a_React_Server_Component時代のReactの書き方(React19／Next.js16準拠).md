---
title: "React Server Component時代のReactの書き方(React19/Next.js16準拠)"
date: 2026/07/27 00:00:00
postid: a
tags:
  - Next.js
  - React
  - サーバーコンポーネント
categories:
  - Frontend
thumbnail: /images/2026/20260727a/thumbnail.png
author: 澁川喜規
lede: "一番Next.jsとかReactを書いていたのはhookが出たあたりで関数コンポーネントになった近辺でだいぶ前ですが、Reactのドキュメントを一通り見ていたところ、かなり書き方が変わっていそうなので、新規プロジェクトでがっつりイマドキの書き方に寄せてみようと思って学びなおしたり、検証したのでその備忘というか整理です。"
---
一番Next.jsとかReactを書いていたのはhookが出たあたりで関数コンポーネントになった近辺でだいぶ前ですが、Reactのドキュメントを一通り見ていたところ、かなり書き方が変わっていそうなので、新規プロジェクトでがっつりイマドキの書き方に寄せてみようと思って学びなおしたり(以前からドキュメントの更新は追いかけてはいた)、検証したのでその備忘というか整理です。

本エントリーの前提としては関数コンポーネント+hooksは知っているよ、ということで進めていきます。関数コンポーネントからだとちょっと差が大きすぎてしまうのでそこは扱いません。

## React 19の考え方

Reactの最近の変更は大まかには次のモチベーションで行われている、と考えると理解しやすいと思いました。

* パフォーマンスの低下原因となる余計な更新処理を減らし、応答性を上げる
* 自分で管理する状態の数とEffectを減らす

いろんな新機能などを見るとこの2つの観点が混ざっているものもありますが、分解してみれば理解しやすいと思います。

あとは昔はなかった3つの言葉が出てきます。これを理解してから見てみないと「React変わりすぎてついていけない」となってしまうと思いました。まずはこちらの解説をします。

* トランジション
* アクション
* ストリーミング

### トランジション

たぶん、一番？となりやすいところかと思います。キーボードの入力のたびに画面表示するとして、変更が重い場合に、React内部の画面の変更(レンダリング)リクエストが溜まってしまう応答性が下がってしまうことがあります。トランジションは「この変更による描画は優先度が低いから重複したら中断したり後回しにしたり破棄してもいい」というのをReactに伝えるものです。

状態変更はロジックで行いますが、そのロジックはReactでは主に2ヶ所に書きます。

* ハンドラ: ユーザーの操作が起点となるもの
* エフェクト: 他の状態変更が起点となり、外部と同期を取るもの

トランジションの中から呼ばれる関数（普通の関数もOK）がアクションと呼ばれます。

なお、トランジションは結果の描画を効率化して応答性を良くしますが、中で行われる通信の抑制はしません。タイプごとにコード補完のために通信する、みたいな場合の通信の間引きみたいな処理は引き続き必要です。

### アクション

トランジションの中から呼ばれる処理です。同期も非同期も可です。サーバーに変更をポストしたりとかが主な役割になるかと思います。

実装方法としては単なる非同期関数とかを作ってもアクションと言えますが、それにちょっと付加価値がついたものもあります。

* [useActionState](https://ja.react.dev/reference/react/useActionState)でラップされて作ったもの。それ単体でのステート管理の機構も持っている。`useState()`のすごい版。非同期関数対応で、アクションが実行中かどうかのフラグ管理もしてくれる
* Server Function。以前サーバーアクションと呼ばれていたもの。サーバーで動く。APIハンドラを作らずに自動で作ってくれる

組み合わせると以下の実装パターンがあります。

* 非同期関数
* `useActionState` + 非同期関数
* サーバー関数
* `useActionState` + サーバー関数(この場合はステートはシリアライズ可能である必要あり)

アクションを呼ぶときはトランジションの中で呼ぶ必要があります。また、標準的なタグだと`<form action={action}/>`がアクションを引数として持っています。アクションをpropsとして渡す場合は、[それを受け取って実際に呼ぶ側がトランジションを開始するのがルール](https://ja.react.dev/reference/react/useTransition#functions-called-in-starttransition-are-called-actions)です。

`'use server'`がついたファイルに書かれたのサーバー関数です。クライアントからも呼べるがHTTPをまたいでの実行となります。

```ts  サーバー関数
'use server';

export async function updateProfile(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;

  if (!name || name.trim().length === 0) {
    return {
      success: false,
      message: '名前を入力してください。',
    };
  }

  await db.user.update({ where: { id }, data: { name, email } });

  return {
    success: true,
    message: 'プロフィールを更新しました！',
    user: { name, email },
  };
}
```

### ストリーミング

`Promise`のいけてる使い方です。サーバーとクライアントの間でPromiseをやり取りする仕組みです。

もともとは[lazy](https://ja.react.dev/reference/react/lazy)のコンポーネント非同期読み込みのために`Promise`をthrowすると解決するまで待つというのが16あたりのころにありましたが、[<Suspense>](https://ja.react.dev/reference/react/Suspense)コンポーネントとの組み合わせで、ロード中などが表示できるようになりました。

[ErrorBoundary](https://github.com/bvaughn/react-error-boundary)は関数コンポーネントとしては長らく提供されてきませんでしたが、サードパーティのライブラリを使うように公式ドキュメントも追加されていますね。

```jsx
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

<ErrorBoundary fallbackRender={<div>エラー中</div>}>
  <Suspense fallback={<div>ロード中</div>}>
    <AsyncComponent /> {/*非同期コンポーネント*/}
  </Suspnse>
</ErrorBoundary>
```

このような`Promise`を扱う仕組みの上に、クライアント／サーバーの間の仕組みとして整理されたのがストリーミングです。

サーバーコンポーネントではデータの取得を非同期に書けますが、awaitで待つのではなく、Promiseのまま子供のコンポーネントなどに渡せるようになりました。こうすることで、ロード中の状態でサーバーサイドレンダリングが行われてクライアントで一時的な結果表示が行われ、サーバー側の処理が終わったらその後フロントエンドが更新されて表示が行われます。

```jsx
import { Suspense } from 'react';
import { fetchUsers } from '../lib/db';
import { UserList } from '../components/UserList';

export default function Page() {
  // ここで await しない！
  const usersPromise = fetchUsers();

  return (
    <main className="p-8">
      <Suspense fallback={
        <div>
          ⏳ ユーザーデータをロード中...
        </div>
      }>
        {/* Promiseのまま子コンポーネントに渡す */}
        <UserList usersPromise={usersPromise} />
      </Suspense>
    </main>
  );
}
```

```tsx
'use client'

import { use } from 'react';
import type { User } from '../lib/db';

type Props = {
  // データそのものではなく「データを取得するPromise」を受け取る
  usersPromise: Promise<User[]>; 
};

export function UserList({ usersPromise }: Props) {
  // React 19の use() で Promise を解決する
  // Promiseが未解決(pending)の間は自動的にサスペンドされ、親の <Suspense> が発火
  const users = use(usersPromise);

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>
          {user.name}
        </li>
      ))}
    </ul>
  );
}
```

今までは同様の非同期更新をしようとすると、一度フロント側がロードされて表示されてから、CSRで`useEffect()`を使って追加情報を取得し、結果を待って更新となっていましたが、初回のサーバーリクエスト時に追加リクエストまで開始するのでかなりリードタイムは更新されます。

## 応答性を上げる

### エフェクトロジックの無駄起動の排除

エフェクトはその名の通り、他のデータなどが変わったあとの作用（副作用）として使います。で、`useEffect()`の2つめの引数にはその中で参照している変数を入れます。それらの変数が変更されたらその中のコードが呼ばれます。最近あまり使うなという風潮ですが、どうしても使うケースはあります。

効率を考えていくと、Effectの「変更を検知したい変数」と「使いたいデータ」が一体化しているのが問題となることがあります。次のコードは`category`と`id`と2つ使っているのでそれを後ろで渡しています。

```tsx IDが変わったらデータを取得して画面を更新したい（カテゴリだけでは呼びたくない）
  const [data, setData] = useState(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch(`https://api.example.com/data/{category}/{id}`);
      const result = await response.json();
    };

    fetchData();
  }, [category, id]);
```

でも、`id`の変更は検知したいが`category`の変化だけだとまだ通信したくないとしてもそれはここでは実現できませんでした。`useRef`とか使えばできたかもしれませんが。

React19で追加された[useEffectEvent](https://react.dev/reference/react/useEffectEvent)を使って実行したいロジックと`useEffect()`を切り離すことができます。`useEffectEvent()`は常に最新の値を使います。

```tsx useEffectとuseEffectEventに分ける
// id変更時に呼びたいロジック
// categoryはその場でレキシカルスコープで見える最新の変数を参照
const fetchData = useEffectEvent(async () => {
  const response = await fetch(`https://api.example.com/data/${category}/${id}`);
  const result = await response.json();
  // setData(result) など
});

useEffect(() => {
  // idが変わった時だけ実行される
  fetchData();
}, [id]); // 依存配列には id だけを含める
```

### 画面更新を遅延させる

`useState()`で状態を更新すると、変更がトリガーされて画面更新が実行されます。
[useDefferedValue](https://react.dev/reference/react/useDeferredValue)でラップしてラップした方を画面表示に使うと、遅延して表示をさせることでユーザーの操作の反映が遅れて操作がスムーズにいかない、というのを抑制します。

```tsx
import { useState, useDeferredValue, memo } from 'react';

export function SearchPage() {
  const [query, setQuery] = useState('');
  
  // deferredQuery は query から少し遅れて更新されます
  const deferredQuery = useDeferredValue(query);

  return (
    <div>
      {/* ユーザー入力は素早く画面反映 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="検索キーワードを入力..."
      />

      {/* 検索結果の表示は遅延ロードさせる */}
      <HeavyList query={deferredQuery} />
    </div>
  );
}
```

## サーバーとの通信の作法

サーバーからのデータ取得周りも整理されて、それにともなう余計なコード（通信前後の状態管理など）はどんどん減ってきています。

### コンポーネント初期化時のGET処理

だいたい、ライフサイクルメソッドやEffectで`fetch()`で情報取得して、それをステートに入れて管理、あるいはSSRだとページのルートの`getServerSideProps()`などでしか状態が取れないのでそこでまとめて取得してコンテキストに入れて・・・みたいな感じでした。中央集権が必要だったからこそたくさんのデータが一か所にあって統制も大変だったのですが、今はだいぶそのあたりは緩和され、コンポーネントごとの管理でよくなってきていると感じます。

以前から、クライアントコンポーネントの場合、SWRなんかは受信や再読み込みが宣言的に記述できてこの通信回りの状態管理はだいぶシンプルになっていました。

```tsx 以前からあるSWR
"use client"

function Profile() {
  // これ！
  const { data, error, isLoading } = useSWR('/api/user', fetcher)
 
  if (error) return <div>failed to load</div>
  if (isLoading) return <div>loading...</div>
  return <div>hello {data.name}!</div>
}
```

サーバーコンポーネントになると、手続き的に書けて状態管理は不要、というよりも書けません。またクライアントだとクライアントのロードが終わって最初のEffectが終わってから通信開始ですが、最初のリクエスト時に取得を開始するので完了までの時間も短くなります。

```tsx サーバーコンポーネントデータ取得
async function Note({id}) {
  const res = await fetch(`/note/{id}`);
  const note = await res.json();
  return (
    <div>
      <Author id={note.authorId} />
      <p>{note}</p>
    </div>
  );
}
```

先ほども紹介したように、`await`を書かないで置けばストリーミングにもできます。`isLoading`相当はReactが面倒を見てくれるという感じですね。

### 初期化以外の通信

ボタン操作やフォーム送信後のデータの更新処理は今まではハンドラの中から`fetch()`を呼び結果をstateに入れるというのが一般的でした。useSWRMutationなどもありますが。自分で書こうとすると、1つの通信でたくさんの状態の管理が必要となります。このあたりは、改善ポイントを発見する良い指標かと思います。生成AIも注意しないとこういうコード書いてきます。

```tsx 昔ながらの状態を全部自分で管理
import React, { useState } from 'react';

export function TraditionalButton() {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResultMessage(null);

    try {
      const response = await fetch('/api/update-user', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        throw new Error('サーバーでエラーが発生しました');
      }
      const data = await response.json();
      setResultMessage(data.message || '更新が完了しました');
      setName('');
    } catch (err: any) {
      setError(err.message || '通信エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button disabled={isLoading} onClick={handleSubmit}>
      {isLoading ? '送信中...' : '送信する'}
    </button>
  );
}
```

`useActionState`を使うとLoading状態管理は減らせます。ついでにエラー管理も`<ErrorBoundary>`に任せるようにしましょう。このサンプルでは省略していますが、[react-error-boundaryのFallbackComponent prop](https://react-error-boundary-lib.vercel.app/examples/fallback-component)を使うとエラー情報を取り出して表示したりできます（他にも色々書き方があります）。

```tsx React 19の書き方
'use client'

import React, { useActionState, startTransition } from 'react';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';

// 初期状態
const initialState = {
  resultMessage: null,
};

// クライアント側で実行するアクション関数
async function updateProfileClient(prevState, formData) {
  const name = formData.get('name') as string;
  const response = await fetch('/api/update-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    // 💡 throw されたエラーは React 19 が自動で捉え、 ErrorBoundary に送られる
    throw new Error('サーバー通信でエラーが発生しました (Status: ' + response.status + ')');
    }
  const data = await response.json();
  return {
    resultMessage: data.message || '更新が完了しました',
  };
}

export function ModernButton() {
  // updateProfileClientをラップしたformAction。内部で管理する状態、ロード状態取得
  const [state, action, isPending] = useActionState(
    updateProfileClient, 
    initialState
  );

  // transitionでラップする
  onClick = startTransition(async () => {
    action();
  })

  return (
    // エラーハンドリング
    <ErrorBoundary fallbackRender={<div>エラー発生</div>}>
      <button onCick={onClick} disabled={isPending}>
        {isPending ? '送信中...' : '送信する'}
      </button>
    </ErrorBoundary>
  );
}
```

`useActionState()`でラップしたのを再度`startTransition()`でラップするのはちょっと無駄っぽいですよね？次のフォーム送信の場合は`startTransition()`不要なのでその感覚は薄れますが、もし`useAcitonState()`の状態管理が不要ならもっと短く書けます。`useTransition()`側で`isPending`フラグが取れるので、この状態管理のためだけに`useActionState()`を書く必要はありません。

```ts 送信結果の管理不要
export function PostOnlyButton() {
  // このstartTransitionと対応したisPendingが同時に取れる
  const [isPending, startTransition] = useTransition()

  function onClick() {
    startTransition(async () => {
      const res = await fetch("/api/send/request")
      :
    })
  }

  return (
    <button onClick={onClick} diabled={isPending}>
      {isPending ? '送信中...' : '送信する'}
    </button>
  )
}

```

### フォーム送信

フォームの場合は`startTransition()`は不要です。フォームのaction propsに直接入れます。 useActionStateでラップするのがクライアントの非同期関数ではなく、サーバー関数だったら、ハイドレーションが終わってなくても起動するらしい。

```ts フォームならuseActionStateはそのままactionに入れられる
export function ModernForm() {
  // updateProfileClientをラップしたformAction。内部で管理する状態、ロード状態取得
  const [state, formAction, isPending] = useActionState(
    updateProfileClient, 
    initialState
  );

  return (
    // エラーハンドリング
    <ErrorBoundary fallbackRender={<div>エラー発生</div>}>
      // onSubmit ではなく action に formAction を渡す
      <form action={formAction}>
        :
        <button onClick={} disabled={isPending}>
          {isPending ? '送信中...' : '送信する'}
        </button>
      </form>
    </ErrorBoundary>
  );
}
```

なお、Reactではなく、react-domパッケージ側の機能になりますが、こちらもアクションのラップが不要で、単に「ロード中」などの状態などが取得したい場合は ``userFormStatus()`` というフックがあります。ここでは`pending`を使っていますが、`data`とか`method`とか`action`の関数も取得できます。

```ts 状態の管理が不要ならuseFormStatus()
import { useFormStatus } from "react-dom";

function Submit() {
  const { pending } = useFormStatus();
  return <button disabled={pending} />
}

export function ModernForm() {
  const { pending, data, method, action } = useFormStatus();
  return (
    <form action={}>
    </form>
  )
}

```

### 通信時の先行UI更新

通信完了を待たずに先に値を更新しておいてユーザーの体感を良くすることがよくあります。

```ts 以前の方法。ロールバック用の値を持っておく
import React, { useState, useRef } from 'react';

export function LegacyLikeCounter() {
  const [count, setCount] = useState(10);
  const [isPending, setIsPending] = useState(false);

  const previousCountRef = useRef<number>(count);

  const handleLike = async () => {
    if (isPending) return; // 連打防止

    // サーバー通信を待たずに、バックアップをとりつつ先にStateを更新する
    previousCountRef.current = count;
    setCount((prev) => prev + 1);
    setIsPending(true);

    try {
      await updateLikeApi();
      // 成功したら何もしない（すでに画面は +1 されているため）
    } catch (err) {
      // 失敗した場合は、useRef から古い値を読み出して手動で復元する！
      alert('失敗したため元の数値に戻します');
      setCount(previousCountRef.current);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button onClick={handleLike} disabled={isPending}>
      ❤️ {count} {isPending && '(更新中...)'}
    </button>
  );
}
```

何度か出てきているトランジションとセットで使う`useOptimistic`というものがあります。トランザクション中では先に`useOptimistic`で値を更新しておきます。画面は先に値が新しくなります。その後、トランジションを抜けるまでに元となる要素（これも`useState`のはず）のsetを呼ぶとOKですが、よばないと、`useOptimistic`は破棄されて元の値が表示されます。

```ts 楽観的な値を使う
export function LikeCounter() {
  const [count, setCount] = useState(10); // 本番State
  const [, startTransition] = useTransition();

  // useOptimistic(本番State, 楽観更新用の計算式)
  const [optimisticCount, setOptimisticCount] = useOptimistic(
    count,
    (current) => current + 1
  );

  const handleLike = () => {
    startTransition(async () => {
      // 先に画面の数字を +1 する（仮）
      setOptimisticCount(count + 1);

      try {
        await updateLikeApi();
        // 成功した時だけ本番Stateを更新
        setCount((prev) => prev + 1);
      } catch (err) {
        // 失敗した時は setCount を呼ばない！
        // ── これだけで自動的に元の数値（10）に戻ります
        alert('失敗したため元の数値に戻します');
      }
    });
  };

  return (
    <button onClick={handleLike}>
      ❤️ {optimisticCount}
    </button>
  );
}
```

### Next.jsのクエリーパラメータを使った検索フォーム通信

先ほどのフォームのsubmitではどちらかというと、フロントエンド主体でフローをコントロールし、更新結果の管理もしていました。サーバーコンポーネント主体かつ検索のようなURLのクエリーに結果を書くフォームだと動きが大幅に変わってきます。

フロントのタスクとしてはURLのクエリーパラメータだけがタスクとなります。その後、Next.jsがサーバーのページのコードを再実行が自動で行われ、その中でDB問い合わせもしくはバックエンドAPI呼び出しをして結果のページを作ると画面が更新される、という流れとなります。

生成AIに何も指示せずに作らせると、すべてクライアントコンポーネント上の処理とされてしまいますがReact Server Componentの構成を生かすフォームはこのようになるはずです。ここはバリデーションとかは不要なので`useActionState()`は使ってませんが、もちろん組み合わせも可能です。

<img src="/images/2026/20260727a/image.png" alt="image.png" width="1200" height="585">

```ts SearchPanel(クライアントコンポーネント)
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type SearchPanelProps = {
	initialQuery: string;
};

export function SearchPanel({ initialQuery }: SearchPanelProps) {
	const router = useRouter();
	const pathname = usePathname();
	const [query, setQuery] = useState(initialQuery);

	const updateUrl = (nextQuery: string) => {
		const trimmedQuery = nextQuery.trim();
		const nextUrl = trimmedQuery
			? `${pathname}?${new URLSearchParams({ q: trimmedQuery }).toString()}`
			: pathname;

		router.replace(nextUrl, { scroll: false });
	};

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				updateUrl(query);
			}}
		>
			<label>
				<span>検索キーワード</span>
				<input
					type="text"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Next.js などを入力"
				/>
			</label>
		</form>
	);
}
```

```jsx  SearchPage（サーバーコンポーネント）
import { SearchPanel } from "@/components/SearchPanel";
import type { SearchItem } from "@/lib/search";
import { getAppUrl } from "../../lib/app-url";

// ページの引数にsearchParmasを設定
export default async function SearchPage({ searchParams }) {
	const { q } = await searchParams;
	const query = q?.trim() ?? "";
    console.log("SearchPage searchParams:", query);
	const apiSearchParams = new URLSearchParams();

	if (query) {
		apiSearchParams.set("q", query);
	}

	const response = await fetch(new URL(`/api/search?${apiSearchParams.toString()}`, getAppUrl()), {
		cache: "no-store",
	});
	const results = (await response.json()) as SearchItem[];

	return (
		<main>
			<section>
				<p>Search</p>
				<h1>本を検索する</h1>
				<p>入力すると URL の q パラメータが更新され、結果も連動して表示されます</p>
				<SearchPanel key={query} initialQuery={query} />
			</section>
			<section>
				<div>
					<h2>{query ? `「${query}」の検索結果` : "検索結果"}</h2>
					<p>{results.length} 件</p>
				</div>
				<ul>
					{results.map((item) => (
						<li key={item.id}>{item.title}</li>
					))}
				</ul>
					{results.length === 0 && (
					<p>該当する本がありません。</p>
				)}
			</section>
		</main>
	);
}
```

## アーキテクチャの変化

これまでもPure React(Client Side Rendering: CSR)、サーバーサイドレンダリング(ISGなども含む)などを提供するNext.jsのPages Routerがありました。これにReactサーバーコンポーネント(RSC)主体のApp Routerが加わりました。

すでに上に登場していますが、RSCはその名の通り、サーバーで動作し仮想DOM的なJSONをフロントに送って表示します。JSロジックの代わりに、サーバーで作ったRSCペイロードを送って差分更新することでシームレスな更新と、JSロジックの削減を両立しています。旧来のReactには様々な弱点がありました。それを解決するためにRSCが導入されました:

* Pure ReactやPages Routerではページの全てを構成できるロジックを配る必要があるためJSサイズが大きかった。サーバー専用コードやライブラリを減らす
* DBやファイルシステムなどのサーバー資源へアクセスするコードをシームレスに書ける
* データ取得コードと表示を近くにする
* Server/Client Componentを1つのReactツリーで統合

その代わり、状態を持てなかったり、イベントハンドラが書けない、ブラウザAPIが利用できないという制約があります。

デフォルトはRSCで、"use client"を書くとクライアントコンポーネントになります。なお、"use server"は全く別のディレクティブでサーバー関数用で非対称なのは混乱の元ですが、サーバーコンポーネント指定のためのものではありません。クライアントコンポーネントはそのロジックがすべてブラウザ上に転送されて動作します。なお、それでもNext.jsを使うと初回のレンダリングはサーバーで行われます。

Pure React(CSR)、Pages Router、App Routerの動きの違いを整理しました。

### Pure React(Client Side Rendering)

PureだったりNext.jsのstatic export、あるいはクライアントコンポーネント利用がこれにあたります。レンダリングの場合はそれを描画するReactのロジックそのものを送ります。複雑なライブラリなどを利用するとJavaScriptのファイルサイズも多くなりがちですし、それを読み込んでロジックが実行されて初めて表示が開始されるので最初の表示までの時間(FCP)がやや遅くなるといわれています。

なお、Next.jsのstatic exportは、App Routerでも使えて、サーバーコンポーネントもビルド時にHTMLを作成するというのはできます。

<img src="/images/2026/20260727a/image_2.png" alt="image.png" width="767" height="375" loading="lazy">

### Next.jsのPages Router

Reactの弱点（当時）だったSEO対策の改善なども考慮されて作られたのがSSRでした。画面全体をサーバー側で一度作ってそれを送信します。その後、ハイドレーションを行ってイベントハンドラなどを注入します。最初にJSを全部読み込み、初回表示後は前述のクライアントレンダリングになります。

<img src="/images/2026/20260727a/image_3.png" alt="image.png" width="759" height="362" loading="lazy">

なお、事前にページ全体のコンテンツを作っておく、SSGや、データが追加されたらそのデータを使ったページを作っておくISGというのもありますが、これはサーバー側のレンダリングをユーザーリクエストの前に作っておくということです。この時代の仕組みは「ページ全体を丸ごとキャッシュする」方向での最適化を全力で行なっています。

### Next.jsのApp Router

RSCが動くようになったのがこちらです。サーバー主体で動きますよ、となると「PHPで良いのでは？」とか思われるかもしれませんが、サーバー側で動くコードとクライアントで動くコードをモザイクのように組み合わせて最適に動くシステムが構築できる基盤というのは他になかなかない特徴です(.netのblazeはそれに近いと聞いたことがあります)。また、クライアントコンポーネントも初回はサーバーでレンダリングされてからPages Routerと同じくハイドレーションして動きます。

<img src="/images/2026/20260727a/image_4.png" alt="image.png" width="754" height="354" loading="lazy">

なお、変更があった部分のみの更新となっていますが、実質layout.tsxの部分は再描画しないが、page.tsxの範囲は毎回全部転送となります。そのため、1ページの中にメインコンテンツ(やリスト)が1つみたいな構成であれば無駄な転送が少ないと言えます。一方、メインのチャット欄・ちょくちょく最新情報で更新されるチャンネル一覧・DMリスト、みたいなメインコンテンツが多いものは1つの更新で他のコンテンツもサーバー側が再描画になり、すべてがRSCペイロードに乗っかってくる、みたいな形になって美味しくなさそうです。なるべくメイン以外はクライアントコンポーネントに逃がすとかが必要かと思います。あと無限スクロールを実装するのはServer ComponentとClient Component両方を組み合わせるなど従来通りのClient Componentだけでやるよりも難易度があがります。

なお、page.tsxを全部転送するかと言って毎回同じCPUコストがかかるかというとそうではなく、コンポーネント単位のキャッシュなどがあるため、RSCペイロードを組み立てるコストは削減可能です。ただし、その全量をクライアントには送ることになります。

Pages Routerはページ全体ごとのキャッシュがメインでしたが、App Routerの場合、page.tsxの外側のlayout.tsx、あるいはコンポーネント単位、API/DBアクセス単位など細かくキャッシュさせる機能が提供されています。

### それぞれのモードやコンポーネントの動作モード

static exportは除いていますが、なぜ今までのReactと違って色々考えることがあるのかというと、今までのNext.jsは、CSRでできることは基本全てできていて、それをサーバー側でもやる、という思想でした。

ただ、Server Componentは、サーバーのみで動作します。なので今までできていたことを「効率化のために捨てる」とことが必要になります。それにより、今までできていなかった最適化の殻を破ることができます。

| 方式 | HTML生成 | ハイドレーション | サーバーで動作 | ブラウザで動作 |
|:-|:-|:-|:-|:-|
| CSR | ブラウザ | なし(初回から必要) |   | ○ |
| SSG | ビルド時| あり | ○ | ○ |
| ISR | ビルド時＋必要時 | あり | ○ | ○ |
| SSR(Pages Router)  | リクエスト時 | あり | ○ | ○ |
| App Router (Server Component) | ビルドorリクエスト時 | なし | ○ |　|
| App Router (Client Component) | ビルドorリクエスト時 | あり | ○ | ○　|

App Routerのビルド時orリクエスト時というのは、パラメータがない、動的要素がないコンポーネントは静的に解決されちゃうという意味です。そういうところも今までできない高速化を図っています。

## 今のところ考えている基本的な方針

さて、ここまで見てきたところで、どのような方針でReact/Next.jsを書いていけばいいかという場合のチーム方針はこんな感じでやろうかと思っています。このあたりは僕がこう考えているだけなので、人によっては別の方針になるかと思います。

1. なるべくサーバーコンポーネントにする
    1. 動的なUIだからクライアントコンポーネント、とあきらめずに、 [daisyUI](https://future-architect.github.io/articles/20211124a/)でJSレスで実現されているものはサーバーコンポーネントで実現できると信じる
    1. ↑で紹介した検索パネルのようにsearchParamsに状態を移せるものかどうか検討する
2. 非同期通信のawaitを調整する。時間がかかかる重い通信・データ取得などはストリーミングも検討する
3. キャッシュできそうな部分を見つけて、コンポーネントキャッシュにしていく
4. クライアントコンポーネントでも状態を減らす
    4. isLoading/isPending系を撲滅して回る
    4. サーバーアクションを活用できないか検討する
    4. フォーム回りのロジックを整理する
4. クライアントコンポーネントの遅そうなハンドラをトランジションにしていく
    4. 一時表示系は`useOptimistic`を使っていく

## まとめ

最初に、Reactの最近の変更のモチベーションとして2つの要素がある、ということを説明しました。それに当てはめるとこんな感じに分類できるのかな、と思います。順番はこのエントリーで紹介した順です。

|  | 応答性を上げる | 状態を減らす |
|:-|:-:|:-:|
| トランジション | 〇 |   |
| `useActionState` |  | 〇 |
| サーバー関数 |   | 〇 |
| ストリーミング | 〇 | 〇 |
| `<Suspense>`/`<ErrorBoundary>` |   | 〇 |
| `useEffectEvent`  | 〇 |   |
| `useDefferedValue`  | 〇 |   |
| サーバーコンポーネント | 〇 | 〇 |
| `useTranstion` | 〇 | 〇 |
| `useActionState` |   | 〇 |
| `useOptimistic` |   | 〇 |

hook出始めの頃のReactのシンプルな仕組みを組み合わせて「変更をコントロールして結果が正しく表示される」というところから、Reactに任せるところは任せて状態を減らし、なおかつReactの描画をコントロールするという感じで、もう一段ギアが上がった感じがあります。非同期通信が扱いやすくなったのもうれしいですね。

難しくなったのか？というと、そんなことはなくてコントロールできる範囲が広がり、設計の方針がシンプルにわかりやすくなった、という感じかに思います。サーバーサイドレンダリングでどうせ作るのであればそれをそのまま活用しようとか、状態管理ピタゴラスイッチは減らしていこう、という公式のメッセージだな、というのを感じました。状態が減ればその分複雑な状態を扱う状態管理ライブラリが必要になることも減ります。通信もサーバーコンポーネントに寄せれば、ワンショットでコンポーネント表示でデータ取得するようなケースはだいぶ楽に書けます。React 18/19で導入された数々をきちんと理解すると、「うわー、前のやり方は無駄が多かったんだ」という気持ちになり少なくとも、以前のReactの書き方に戻ろうとは思えなくなりました。

19で追加された`useSyncExternalStore`とかexperimentalな`<ViewTransition>`みたいな面白そうな機能もあったりしますが、よく使いそうなところでまとめてみました。
