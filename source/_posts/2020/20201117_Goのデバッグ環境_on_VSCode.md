---
title: "Goのデバッグ環境 on VSCode"
date: 2020/11/17 00:00:00
postid: ""
tag:
  - Go
  - VSCode
  - 環境構築
category:
  - Programming
thumbnail: /images/2020/20201117/thumbnail.png
author: 富山龍之介
lede: "私の使用するテキストエディタはVim一択でしたが、最近はVSCodeに浮気気味です。（言わずもがなVimプラグインは入れていますが）今回はVSCodeでGo言語用のデバッグ環境をテーマに執筆してみたいと思います！"
---
<img src="/images/2020/20201117/image.png" loading="lazy">

# はじめに

こんにちは。TIG/DXユニットの富山です。

私の使用するテキストエディタはVim一択でしたが、最近はVSCodeに浮気気味です（言わずもがな [Vimプラグイン](https://marketplace.visualstudio.com/items?itemName=vscodevim.vim)は入れています）

今回はVSCodeでGo言語用のデバッグ環境をテーマします！

# 環境構築

前提条件:

1. VSCodeがインストール済であること
2. Goがインストール済であること

## Step 1：プラグインのインストール

Googleが公開しているVSCode用のGoプラグインである、[Go for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=golang.Go)をインストールします（2020年6月に開発管理がMicrosoftからGoogleのGo開発チームへ移管されました）。
<img src="/images/2020/20201117/image_2.png" loading="lazy">

インストールが終わったら、Goプラグインに必要な各種ツールをインストールしていきます。

1. コマンドパレットを開く（Windows: `Ctrl + Shift` + `p` / Mac: `Command` + `Shift` + `p`）
2. `>Go: Install/Update Tools` と入力する。
3. 表示されるツールから任意のツールにチェックを入れる。
<img src="/images/2020/20201117/image_3.png" loading="lazy">
4. `OK` ボタンを押下

VSCode上のターミナルに下記表示がされたら成功です。

```plaintext
Tools environment: GOPATH=C:\Users\username\go
Installing 16 tools at C:\Users\username\go\bin in module mode.
  gocode
  gopkgs
  go-outline
  go-symbols
  guru
  gorename
  gotests
  gomodifytags
  impl
  fillstruct
  goplay
  godoctor
  dlv
  gocode-gomod
  godef
  golint

Installing github.com/mdempsky/gocode (C:\Users\username\go\bin\gocode.exe) SUCCEEDED
Installing github.com/uudashr/gopkgs/v2/cmd/gopkgs (C:\Users\username\go\bin\gopkgs.exe) SUCCEEDED
Installing github.com/ramya-rao-a/go-outline (C:\Users\username\go\bin\go-outline.exe) SUCCEEDED
Installing github.com/acroca/go-symbols (C:\Users\username\go\bin\go-symbols.exe) SUCCEEDED
Installing golang.org/x/tools/cmd/guru (C:\Users\username\go\bin\guru.exe) SUCCEEDED
Installing golang.org/x/tools/cmd/gorename (C:\Users\username\go\bin\gorename.exe) SUCCEEDED
Installing github.com/cweill/gotests/... (C:\Users\username\go\bin\gotests.exe) SUCCEEDED
Installing github.com/fatih/gomodifytags (C:\Users\username\go\bin\gomodifytags.exe) SUCCEEDED
Installing github.com/josharian/impl (C:\Users\username\go\bin\impl.exe) SUCCEEDED
Installing github.com/davidrjenni/reftools/cmd/fillstruct (C:\Users\username\go\bin\fillstruct.exe) SUCCEEDED
Installing github.com/haya14busa/goplay/cmd/goplay (C:\Users\username\go\bin\goplay.exe) SUCCEEDED
Installing github.com/godoctor/godoctor (C:\Users\username\go\bin\godoctor.exe) SUCCEEDED
Installing github.com/go-delve/delve/cmd/dlv (C:\Users\username\go\bin\dlv.exe) SUCCEEDED
Installing github.com/stamblerre/gocode (C:\Users\username\go\bin\gocode-gomod.exe) SUCCEEDED
Installing github.com/rogpeppe/godef (C:\Users\username\go\bin\godef.exe) SUCCEEDED
Installing golang.org/x/lint/golint (C:\Users\username\go\bin\golint.exe) SUCCEEDED

All tools successfully installed. You are ready to Go :).
```

### Step 2：デバッガツール `delve` のインストール

今回はGoのデバッグツールである、[delve](https://github.com/derekparker/delve) を使用します。

> Step1-3.　表示されるツールから任意のツールにチェックを入れる。

にて、 `dlv` にチェックを入れている場合、VSCode側でインストールを行ってくれるので、このステップは飛ばして大丈夫です。

インストールを行うために、下記コマンドを実行します。

```bash
go get -u github.com/derekparker/delve/cmd/dlv
```

インストールが完了したら、ターミナル上で `dlv` コマンドが実行できることを確認してください。

```bash
$ dlv version
Delve Debugger
Version: 1.5.0
Build: $Id: ca5318932770ca063fc9885b4764c30bfaf8a199 $
```

# 使ってみた

それではVSCodeからデバッグを行ってみましょう。

手始めにVSCodeで簡単なGoプログラムを書いてみます。

```go main.go
package main

import "fmt"

func main() {
	msg := "hello world"
	fmt.Println(msg)
}
```

### デバッグのセットアップ

#### `launch.json` の作成

1. VSCodeの `RUN` コンソール画面に移動
2. `create a launch.json file.` を押下
3. VSCode中央上部に `Select Environment` と表示されるので、 `Go Dlv (Experimental)` を選択
<img src="/images/2020/20201117/image_4.png" loading="lazy">

上記 3終了後に `.vscode/launch.json` ファイルが生成されます。

デフォルトでは、`type`フィールドが `"type": "godlvdap"` となっているので、`"type": "go"` へ書き換えましょう。

```json launch.json
{
    // Use IntelliSense to learn about possible attributes.
    // Hover to view descriptions of existing attributes.
    // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Launch",
            // "type": "godlvdap",
            "type": "go",
            "request": "launch",
            "mode": "auto",
            "program": "${fileDirname}",
            "env": {},
            "args": []
        }
    ]
}
```

ちなみに、単体テストのデバッグを行う場合は、下記のように設定します。

```json launch.json(一部抜粋)
            "mode": "test",
            "args": [
                "-test.v",
                "-test.run",
                "TestYourFunc"
            ],
```

1. `args` に `-test.v` とすることで `verboseモード`
2. テスト関数単位で実行する場合は `-test.run` と置き、対象とするテスト関数名を記載します（例だと `TestYourFunc`）

今回は紹介しませんが、`launch.json` には他にも予約語の属性が存在するので、興味をお持ちの方は[こちら](https://code.visualstudio.com/docs/editor/debugging#_launchjson-attributes)をご参照ください。

## いざ、デバッグ

さぁ、実行してみましょう。

9行目にブレークポイントを設定してみます（行番号の左側をクリックで設定）

赤丸が該当行左側に表示されたら、設定完了です。
<img src="/images/2020/20201117/image_5.png" loading="lazy">

ブレークポイントの設定が終わったら、 `F5`キーで実行してみます。

RUNコンソールの`VARIABLES`部分にて、ブレークポイントで設定した行の変数の中身が確認できていますね。これは便利です。

<img src="/images/2020/20201117/image_6.png" loading="lazy">
また、VSCode画面中央上部に表示されているパネルでContinueをはじめ、Restartなどの操作ができます。

# 関連情報

VSCodeのGo周りでは多賀さんの記事もオススメです。

* [VSCode の Go extension でよく利用するコマンド 7選](/articles/20200707/)

市川さんの記事のVSCodeの拡張機能の共有方法すると便利です。

* [チームで推奨するVSCode拡張機能を共有するtips術](/articles/20200828/)

# おわりに

これでデバッグ用にPrint文を埋め込んだままcommitしてしまう自分にオサラバです👋

デバッグ機能をフル活用して快適な開発ライフを。
