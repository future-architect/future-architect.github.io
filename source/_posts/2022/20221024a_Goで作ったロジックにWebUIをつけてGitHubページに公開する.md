---
title: "Goで作ったロジックにWebUIをつけてGitHubページに公開する"
date: 2022/10/24 00:00:00
postid: a
tag:
  - Next.js
  - Go
  - WASM
  - フロントエンド
category:
  - Programming
thumbnail: /images/20221024a/thumbnail.png
author: 澁川喜規
lede: "ちょっとしたツールをGoで作ってみたのですが、わざわざインストールしなくてもいいようにWebのUIをつけてブラウザで使えるようにしてみました。ウェブフロントエンド部分はNext.jsの静的サイトで、GoはWASMにしてロードして実行しています。WASMを使うのは初めてなのであえて選んでみました。"
---
ちょっとしたツールをGoで作ってみたのですが、わざわざインストールしなくてもいいようにWebのUIをつけてブラウザで使えるようにしてみました。作ってみたのは以下のツールで、Markdownのリスト形式でざっと下書きしたテーブルの設計をSQLとか、PlantUMLとかMermaid.js形式のERDの図にします。

https://shibukawa.github.io/md2sql/

<img src="/images/20221024a/スクリーンショット_2022-10-18_8.38.26.png" alt="" width="1200" height="714" loading="lazy">

ウェブフロントエンド部分はNext.jsの静的サイトで、GoはWASMにしてロードして実行しています。WASMを使うのは初めてなのであえて選んでみました。

# GoをWASM化する

もともとCLIツールは作っておりました。CLIのメインは[cmd/md2sql/main.go](https://github.com/shibukawa/md2sql/blob/main/cmd/md2sql/main.go)で作っていました。この中でやっていることは

* kingpin.v2のオプションパース
* 指定されたファイルを読み込み(あるいは標準入力)
* パース
* 指定の形式変換

です。このうち、Web化する場合は後者の2個だけ必要ですし、コマンドラインオプションのパースとかは不要なので、WASM化用のmain.goを別途作ります。それが[cmd/wasm/main.go](https://github.com/shibukawa/md2sql/blob/main/cmd/wasm/main.go)です。JSから呼ばれる関数は``js.Value``で引数を受け取るエントリー関数を用意しておきます。``ConvertToSQL()``がこれにあたります。そしてJS側から呼べるように、``js.Global()``に作ったAPIを追加します。

```go
//go:build wasm

package main

import (
	"bytes"
	"strings"
	"syscall/js"

	"github.com/shibukawa/md2sql"
)

func ConvertToSQL(this js.Value, args []js.Value) any {
	if len(args) < 1 {
		return map[string]any{
			"ok":      false,
			"message": "first argument should be markdown source.",
		}
	}
	tables, err := md2sql.Parse(strings.NewReader(args[0].String()))
	if err != nil {
		return map[string]any{
			"ok":      false,
			"message": err.Error(),
		}
	}
	var buf bytes.Buffer
	md2sql.DumpSQL(&buf, tables, md2sql.PostgreSQL)
	return map[string]any{
		"ok":     true,
		"result": buf.String(),
	}
}

// Mermaid/PlantUML変換は省略

func main() {
	c := make(chan struct{})
	js.Global().Set("md2sql", js.ValueOf(map[string]any{
		"toSQL":      js.FuncOf(ConvertToSQL),
		"toMermaid":  js.FuncOf(ConvertToMermaid),
		"toPlantUML": js.FuncOf(ConvertToPlantUML),
	}))
	<-c // 終了しないようにブロック
}
```

次のコマンドでwasmが生成されることを確認しておきます。

```bash
$ GOOS=js GOARCH=wasm go build -o md2sql.wasm
```

実行時にローダーも必要なのでwasm_exec.jsを取得しておきます。

```bash
$ cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" .
```

# Webの画面を作る

/cmd/frontendをつくるようにcreate-next-appを実行し、最近お気に入りの[Tailwind.CSSとdaisyUI](https://future-architect.github.io/articles/20211124a/)の組み合わせで、ページトップのスクリーンショットのような画面を作りました。テキストボックスに入れられたソースコードを``useRef``の変数に一時変数に入れておいて、generateボタンを押されたらGoコードを呼び出して実行します。

まず、Next.jsが動くページは、ドメイン(shibukawa.github.io)直下ではなく、/md2sql/というフォルダの中で動くのでbasePathを設定します。ついでに、静的サイト生成してアップするので画像の最適化もオフにしておきます。

```js /cmd/frontend/next.config.js
const nextConfig = {
  basePath: '/md2sql',     // 追加
  reactStrictMode: true,
  swcMinify: true,
  images: {                // 追加
    unoptimized: true
  }
}
```

ついでにロードするWASMが公開する関数の型定義を宣言します。

```ts /cmd/frontend/md2sql.d.ts
type f = (src: string) => { ok: true, result: string} | {ok: false, message: string};

declare var md2sql:{
    toSQL: f,
    toMermaid: f,
    toPlantUML: f,
};
```

`tsconfig.json`にこの追加したmd2sql.d.tsを追加しておきます。最初next-env.d.tsに追加してやっていたのですが、このファイルってビルドのたびに再生成されてしまうので消えてしまいます。

```json /cmd/frontend/tsconfig.json
{
  "include": ["next-env.d.ts", "md2sql.d.ts", "**/*.ts", "**/*.tsx"],
}
```

`wasm_exec.js`はNext.jsのpublicフォルダに入れておきます。

ビルド周りもいろいろ書き換えておきます。静的サイト生成なので、next build後にnext exportも実行するのと、GitHubの制約でリポジトリのルート以下の/docsフォルダに生成されたファイルを移動、`.nojekyll`ファイルをその中に作る、というのを一緒にやります。ついでにGoのビルドもここに入れておきました。

さっとやったのでWindowsでは動かない書き方をしています。すみません。Windowsだったら[shelljs](https://www.npmjs.com/package/shelljs)とか[crossenv](https://www.npmjs.com/package/crossenv)を使ってください。

```json /cmd/frontend/package.json
{
  "scripts": {
    "prebuild": "cd ../wasm && GOOS=js GOARCH=wasm go build -o ../frontend/public/md2sql.wasm",
    "build": "next build",
    "postbuild": "next export && mv out ../../docs && touch ../../docs/.nojekyll"
  }
}
```

# 繋げる部分のコード

wasm_exec.jsをロードして実行するコードを書きます。Next.jsでは任意のページ内とかコンポーネント内で宣言しておけば、ページのヘッダー部分に`<script>`タグを作って遅延ロードしてくれる[`next/script`コンポーネント](https://nextjs.org/docs/basic-features/script)があるのでこれを使います。一応この[wasm_exec.jsの型定義も](https://www.npmjs.com/package/@types/golang-wasm-exec)入れようと思えば入れられますが、今回はts-ignoreで済ませてしまいました。定型文ですし。GitHubページのプロジェクトページなのでjsもwasmもパスが`/md2sql/`以下にある想定で書きます。

```tsx /cmd/frontend/pages/index.tsx
import Script from 'next/script'

:中略

{ /* Load web assembly */ }
<Script id="exec-wasm" src="/md2sql/wasm_exec.js" onLoad={() => {
    // @ts-ignore
    const go = new Go();
    WebAssembly.instantiateStreaming(fetch("/md2sql/md2sql.wasm"), go.importObject).then((result) => {
        go.run(result.instance);
    });
}}/>
```

WASMのロジックは生成のコールバックが呼ばれた時に呼び出します。型定義があるのでその通りに呼んであげればOKです。本当はエラーはトーストとかでポップアップさせた方が良いけどとりあえず雑にコンソールに書いてます。

```tsx /cmd/frontend/pages/index.tsx
  const generate = useCallback(() => {
    switch (format) {
      case "sql":
        const r1 = md2sql.toSQL(src.current);
        if (r1.ok) {
          setResult(r1.result);
        } else {
          console.error(r1.message);
        }
        break;
      // 以下略
    }
  }, [format])
```

接点としてはこの「起動時のロード」と、ローダーが登録した関数の呼び出しだけですので、あとはウェブフロントエンド作れる人には特に問題なく進められると思います。

# まとめ

思ったよりもWASM化が簡単にできました。作業時間の半分はGitHubページのフォルダがルート直下じゃないことで起きる問題のトラブルシュートでした。繋ぐ部分を作ってローカルで試すのは思ったよりもすぐでした。

なお、標準のGoコンパイラでやっていますので生成されるwasmファイルは大きめ(5.5MB、gzip時に1.3MB)ですが、TinyGoを使えばもっと小さいものが作れますが、標準のGoの方が互換性が高いというメリットはあります。以前はgopher.jsを使ったりしたこともありますが、標準処理系でできるのはありがたいですね。まあ、あちらは.jsになるのでローダーが不要というメリットはあります。

今後も、小さいな補助ツールを作ったらウェブで簡単に実行できるようにしていこうと思いました。

# 参考

* [GoのコードをWebAssenblyにコンパイルしてブラウザ上でGoを実行する](https://www.asobou.co.jp/blog/web/go-webassembly)
* [Go and WebAssembly (I): interacting with your browser JS API](https://macias.info/entry/202003151900_go_wasm_js.md)

