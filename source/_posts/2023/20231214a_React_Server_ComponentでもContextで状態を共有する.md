---
title: "React Server ComponentでもContextで状態を共有する"
date: 2023/12/14 00:00:00
postid: a
tag:
  - React
  - Next.js
  - RSC
  - サーバーコンポーネント
category:
  - Frontend
thumbnail: /images/2023/20231214a/thumbnail.png
author: 澁川喜規
lede: "Next.jsの最近の大きな目玉機能はReact Server Componentです。パフォーマンスアップに有効だったり、gRPCだRESTだGraphQLだ論争を終わりにするServer Actionsなど盛りだくさんです。一方で、サーバーコンポーネントはコーディング上の制約がいろいろあります。"
---
Next.jsの最近の大きな目玉機能はReact Server Component(以下サーバーコンポーネント)です。パフォーマンスアップに有効だったり、gRPCだRESTだGraphQLだ論争を終わりにするServer Actionsなど盛りだくさんです。

一方で、サーバーコンポーネントはコーディング上の制約がいろいろあります。

* サーバーコンポーネントではhooksが使えない
* サーバーコンポーネントのソースからクライアントコンポーネントは`import`できるが逆はできない。レンダーツリーを工夫すればクライアントコンポーネントの下にサーバーコンポーネントを配置することは可能

サーバーコンポーネントでは非同期コンポーネントを作成でき、`fetch`でサーバーから情報をとってきたり、DBアクセスした結果を利用できます。しかし、最近のモダンReactの場合、状態管理などはすべてhooksに寄せるので大きくコードの変更が必要になってしまいます。せっかくとってきたデータを全部propsでバケツリレーしなければならないとなると不便です。利用が必要な個所で個別にフェッチするという実装もありです。Next.jsはキャッシュして呼び出しを減らしてくれますが以下のようなケースではカバーしきれません

* `fetch()`以外の、たとえばDB接続での取得では重複リクエストになる
* 利用したい箇所がクライアントコンポーネントの場合、最寄りのサーバーコンポーネントからバケツリレーが必要

コード量も増え、速度も遅くなったらうれしくないですよね。

しかし、後者の制約の脱出ハッチを使えばContextを利用してサーバーから取得した値を子供のコンポーネントに流してやれるのではないか、と思ったので試してみました。これが利用できればサーバーから取得する値はコンテキストに入れておいて、バケツリレーを回避できます。サーバーコンポーネントは根っこの方に近いコンポーネントで利用されますが、そこでコンテキストが使えれば既存のコードから大幅な書き換えを減らせるはずです。

# Next.jsアプリケーションの作成

次のコマンドでさっと作成します。いろいろオプションを聞かれますが、サーバーコンポーネントを使うためにappルーターを選びます。このサンプルはTypeScriptにしているのでTypeScriptも選んでいますが、型を外せばJSでも動くでしょう。

```bash
npx create-next-app@latest
```

さっそくトップページを書き換えていきます。まずダメだった例を紹介します。

```ts src/state/index.ts
// ダメだった例
import { createContext, useContext } from "react"

// コンテキストに入れるデータ型
export type User = {
    name: string;
    email: string;
}

// コンテキストを作成
export const LoginContext = createContext({
    name: "default",
    email: "default@example.com"
} as User);

// 値を取得するカスタムフック
export function useUser() {
    return useContext(LoginContext)
}
```

```tsx src/app/page.tsx
// ダメだった例
import { LoginContext } from "../state"
import { Child } from "./child"

export default function Home() {
  // 本当はここでDBアクセスや外部APIアクセスをしてユーザー情報をとってくる
  const user = {name: "shibukawa", email: "shibukawa@example.com"}

  return (
    <LoginContext.Provider value={user}>
      <main>
        <Child />
      </main>
    </LoginContext.Provider>
  )
}
```

```tsx src/app/child.tsx
// コンテキストから値を取得して表示するクライアントコンポーネント
"use client"

import { useUser } from "@/state"

export function Child() {
    const user = useUser()
    console.log(user)
    return (
        <dl>
            <dt><label htmlFor="name">name</label></dt>
            <dd><output id="name">{user.name}</output></dd>
            <dt><label htmlFor="email">email</label></dt>
            <dd><output id="email">{user.email}</output></dd>
        </dl>
    )
}
```

どこがダメでしょうか？ 実行してみると、`createContext()`の呼出はダメよ、とエラーになっています。このファイルに"use client"を足してもダメです。

<img src="/images/2023/20231214a/image.png" alt="image.png" width="1159" height="688" loading="lazy">

この`createContext()`を含むコードを全部クライアントコンポーネントに追い出せばOKです。次のステップでこれを直していきます。

# OKなコード

まず、コンテキストを作成するだけではなく、それをラップした`<Provider>`クライアントコンポーネントを作成します。

```tsx src/state/index.tsx
"use client"

import { createContext, useContext, ReactNode } from "react"

// User, LoginContext, useUserは変化なし

type Props = {
    children: ReactNode,
    user: User,
}

// コンテキストのProviderを呼び出すクライアントコンポーネントを作成する
export function Provider({ children, user }: Props) {
    return <LoginContext.Provider value={user}>
        {children}
    </LoginContext.Provider>
}
```

```tsx src/app/page.tsx
import { Child } from "./child"
import { Provider } from "../state"

export default function Home() {
  // LoginProviderの代わりに、クライアントコンポーネントのProviderを利用
  return (
    <Provider user={{ name: "shibukawa", email: "shibukawa@example.com" }}>
      <main>
        <Child />
      </main>
    </Provider>
  )
}
```

これでうまく表示されます。

<img src="/images/2023/20231214a/image_2.png" alt="image.png" width="1004" height="469" loading="lazy">

レンダリングツリーとしては次のような形になります。Homeコンポーネントで、現在は即値ですがサーバーから取得した情報をProviderコンポーネントに渡し、このコンポーネントがコンテキストに格納します。Childコンポーネントはバケツリレーではなく、コンテキスト経由でユーザー情報を取得します。

<img src="/images/2023/20231214a/名称未設定ファイル-ページ1.drawio.png" alt="名称未設定ファイル-ページ1.drawio.png" width="339" height="211" loading="lazy">

ソースコードのインポートの依存関係は次の通りで、サーバー→クライアントの参照はあるが、クライアント→サーバーの参照はないため、React Server Componentの規約には反していません。

<img src="/images/2023/20231214a/名称未設定ファイル-ページ2.drawio.png" alt="名称未設定ファイル-ページ2.drawio.png" width="401" height="131" loading="lazy">

これでサーバーから取得した値もコンテキスト経由で子供のコンポーネントに参照させてあげられますね。もちろん、間に挟まるサーバーコンポーネントでは`useContext`は使えないため、サーバーコンポーネントが利用したい値はフェッチで取るか、親からPropsで渡す必要があります。

# まとめ

クライアントコンポーネントを経由することでコンテキストが利用できました。Reduxも、Recoilも、Jotaiも、すべて内部ではコンテキストを使って実現しています。コンテキストをクライアントコンポーネントとしてラップすることで使えるということは、これらの状態管理ライブラリもサーバーコンポーネントであろうと今まで通り使えるということです。

この手法を使えば既存のコードからの変更を小さくできるので、appルーターに移植するときに「とりあえず全部に"use client"をつけて回る、ということをしないでもよくなりますね。
