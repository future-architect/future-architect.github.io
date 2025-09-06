---
title: "WebAssemblyとEmscriptenに入門した"
date: 2023/05/17 00:00:00
postid: a
tag:
  - 入門
  - WebAssembly
  - C/C++
category:
  - Frontend
thumbnail: /images/2023/20230517a/thumbnail.png
author: 森直也
lede: "EmscriptenはC/C++をWebAssemblyにコンパイルするツールである、Emscriptenに入門した際の流れや気付きについて紹介します。"
---
<img src="/images/2023/20230517a/Emscripten_logo_full.png" alt="" width="612" height="167" loading="lazy">

## はじめに

はじめまして。2022年4月入社、金融グループ所属の森です。

[春の入門ブログ連載](/articles/20230417a/)の19日目の記事です。

WebAssembly/Emscriptenに入門した際の流れや気付きについて紹介します。

内容としては、

1. WebAssemblyの概要
2. Emscriptenの概要
3. EmscriptenでCをWebAssemblyにコンパイルする方法
4. JavaScriptからの呼び出し方

について触れます。

## 1. WebAssemblyの概要

WebAssemblyは

- CやRustなどで書いたコードから生成できる
- ウェブ上でJavaScriptと一緒に動く
- 高速に動作する

以上のような特徴を持った言語で、**Wasm**という略称を持っています。

CやRustで書いた既存のソースコードを使用したいケースや、3D処理のような実行速度が求められるケースで活用できそうです。

## 2. Emscriptenの概要

EmscriptenはC/C++をWebAssemblyにコンパイルするツールです。

UnrealEngineやUnityなどのゲームエンジンや、QtのようなアプリケーションフレームワークをWasmに変換するためなどに利用されています。その他にも多くの利用例が[wiki](https://github.com/emscripten-core/emscripten/wiki/Porting-Examples-and-Demos)にまとめられています。

## 3. EmscriptenでCからWasmにコンパイルする

EmscriptenでC言語で書かれたソースコードをWasmにコンパイルします。Emscripten SDKの導入は[こちら](https://emscripten.org/docs/getting_started/downloads.html)から行います。

### 使用したCプログラム

`test.c` を以下の内容で作成します。
ここで定義している、2つの整数を受け取り和を返す関数 `add()` をブラウザから使用することを目指します。

エクスポートする関数は `EMSCRIPTEN_KEEPALIVE` というマクロで指定しています。
かわりにコンパイル時のオプションとして指定することも可能です。

```c test.c
#include "stdio.h"
#include "emscripten/emscripten.h"

EMSCRIPTEN_KEEPALIVE
int add(int a,int b) {
    return a+b;
}
```

### Wasmへのコンパイル

先程用意したCプログラムをWasmにコンパイルします。
コマンドは以下の通りです。

```sh
emcc -o test.js test.c -sEXPORTED_RUNTIME_METHODS=ccall,cwrap
```

このコマンドを実行することによって `test.wasm` と `test.js` が出力されます。

`test.wasm` はCプログラムが変換されたバイナリです。
`test.js` は `test.wasm` をコンパイル、インスタンス化する内容などを含むJavaScriptファイルです。

`-sEXPORTED_RUNTIME_METHODS=ccall,cwrap` というオプションによって、`test.js`にこれらのメソッドが追加されます。`ccall`,`cwrap` はどちらもエクスポートされたCの関数を呼び出すメソッドです。詳細は後ほど説明します。

また以下のようにコマンドを実行した場合、`test.js` を実行しブラウザに表示する `test.html` も出力できます。
出力される `test.html` は今回の記事で説明しないものを多く含むので、htmlについては自分で作成したものを使用していきます。

```sh
emcc -o test.html test.c -sEXPORTED_RUNTIME_METHODS=ccall,cwrap
```

## 4. JavaScriptからWasmを呼び出す

JavaScriptからコンパイルされたCの関数を呼び出す2種類の方法について試してみました。

### ccallを使用した方法

以下のようにhtmlを作成し、ブラウザで読み込んでみます。

```html ccall.html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Hello Wasm</title>
  </head>
  <body>
    value 1 : <input type="number" id="value1" /> <br />
    value 2 : <input type="number" id="value2" />
    <button id="button">add</button> <br />
    <p id="result"></p>
    <script src="test.js"></script>
    <script>
      document.getElementById("button").addEventListener("click", () => {
        const result = Module.ccall(
          "add",
          "number",
          ["number", "number"],
          [
            document.getElementById("value1").value,
            document.getElementById("value2").value,
          ]
        );
        document.getElementById("result").textContent = result;
      });
    </script>
  </body>
</html>
```

<img src="/images/2023/20230517a/image.png" alt="" width="509" height="159" loading="lazy">

addボタンを押すたびに `Module.ccall()` によってCプログラムで定義した `add()` が呼び出され和を計算しています。

引数には呼び出すCの関数の"関数名"、"戻り値の型"、"引数の型"、"引数"を渡すことで実行できます。

### cwrapを使用した方法

次に、新しく以下のhtmlを作成し再度ブラウザで読み込んでみます。

```html cwrap.html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Hello Wasm</title>
  </head>
  <body>
    <script src="test.js"></script>
    <script>
      Module.onRuntimeInitialized = () => {
      	const add = Module.cwrap("add",'number',['number', 'number'])
      	console.log(add(1,2))
      	console.log(add(3,4))
      	console.log(add(5,6))
    </script>
  </body>
</html>
```

<img src="/images/2023/20230517a/image_2.png" alt="" width="849" height="182" loading="lazy">

コンソールに計算結果が表示されていることが確認できます。`cwrap` はCの関数の"関数名"、"戻り値の型"、"引数の型"を引数とし、Cの関数を実行するJavaScriptの関数を返します。

何度も同じ関数を使用する必要がある場合は `ccall` に比べて記述がスッキリしますね。

最初に実装した際はscriptタグを以下のように書いてエラーが発生しました。どうやらランタイムの準備が完了する前にwasmモジュールを使おうとしたことが原因のようです。

`Module.onRuntimeInitialized` によって初期化の完了後に実行することで回避ができました。

```html cwrap_error.html
<script>
  const add = Module.cwrap("add", "number", ["number", "number"]);
  console.log(add(1, 2));
  console.log(add(3, 4));
  console.log(add(5, 6));
</script>
```

```sh
Uncaught RuntimeError: Aborted(Assertion failed: native function `add` called before runtime initialization)
```

## さいごに

ブラウザ上でC言語を動作させる技術として以前から気になっていたWebAssemblyとEmscriptenについて、簡単に触ってみた内容を記事にさせていただきました。Emscriptenによって出力される内容がかなり充実しており、ほとんど実装することなくブラウザ上での動作を実現できました。

Emscriptenを中心に理解を深めることができましたが、今後はWebAssembly自体について詳しく見ていきたいと思います。

次の記事は佐々木さんの[ネットワーク入門としてCCNA試験を受験してみた](/articles/20230518a/)です！
