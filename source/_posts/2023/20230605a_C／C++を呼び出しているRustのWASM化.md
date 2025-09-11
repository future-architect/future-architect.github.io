---
title: "C/C++を呼び出しているRustのWASM化"
date: 2023/06/05 00:00:00
postid: a
tag:
  - WebAssembly
  - Rust
  - C/C++
  - tree-sitter
category:
  - Programming
thumbnail: /images/2023/20230602a/thumbnail.png
author: 川渕皓太
lede: "C/C++を呼び出しているRustのwasm化について説明します。結論から述べるとemscriptenを使用することでうまくいきました。"
---

## はじめに

こんにちは、Futureでアルバイトをしている川渕です。

本記事ではC/C++を呼び出しているRustのwasm化について説明します。結論から述べるとemscriptenを使用することでうまくいきました。

## 経緯

アルバイトの前はインターンシップでRust製SQLフォーマッタであるuroborosql-fmtの作成を行なっていました。([前編](/articles/20220916b/), [後編](/articles/20220916c/))
現在はアルバイトで[拡張機能化](/articles/20221228a/)やwasm化を行なっています。

基本的にRustで書いたコードのwasm化は簡単に行えるのですが、今回はC/C++で書かれたプロジェクトに依存していたため非常に苦戦しました。最終的になんとかwasm化に成功したので、本記事ではその方法について説明します。

## 説明すること

* WebAssembly(wasm)とは何か
* Rustをwasm化する主な方法とチュートリアル
  * wasm-pack
  * wasm32-unknown-emscripten
* C/C++を呼んでいるRustのwasm化
* 性能検証

## 説明しないこと

* WebAssembly System Interface(wasi)について

## 環境

OS: macOS Monterey 12.6.1
CPU: Apple M1 Pro
Rust: 1.67.1

## WebAssembly(wasm)とは

現在ブラウザ上でプログラムを実行する場合はJavaScriptが使用されます。JavaScriptの役割は元々HTMLの補助程度でしたが、現在はさまざまな用途に使用されており、速度が求められています。近年ではJITコンパイルによって高速化が行われていますが、JITコンパイルはよく呼び出される部分しかコンパイルされない、型推論を間違える可能性がある、などの欠点があります。

そこで、WebAssembly(wasm)という「ブラウザ上で動くバイナリコードの新しいフォーマット(仕様)」が開発されました。wasmは現在Firefox、Chrome、Safari、Edge等の主要なブラウザの全てに対応しており、Google, Microsoft, Mozilla, Appleによって仕様が策定され開発が進められています。

基本的に直接記述ではなく、C/C++やRust、Golang、TypeScriptなどからコンパイルされます。wasmはJavaScriptを補完する目的で開発されており、JavaScriptから呼び出すことで実行できます。また、wasmからJavaScriptの機能にアクセスすることもできます。

wasmはCPUの活用、起動の高速化から、ネイティブアプリ並の速度で動作すると言われており、実際に多くのアプリケーションでwasmが使用されています。

* [Figma](https://www.figma.com/ja/) ([記事](https://www.figma.com/ja/blog/webassembly-cut-figmas-load-time-by-3x/))
* [sqlite](https://sqlite.org/index.html) ([ドキュメント](https://sqlite.org/wasm/doc/trunk/index.md))
* [Google Earth](https://www.google.co.jp/intl/ja/earth/) ([記事](https://medium.com/google-earth/google-earth-comes-to-more-browsers-thanks-to-webassembly-1877d95810d6))

また、wasm化することでフロントエンドだけでアプリケーションが動くようになるため、RustやGoで書いたアプリケーションも簡単にGitHub Pagesなどの静的なサイトで実行できます。

<!--
> WebAssembly は最近のウェブブラウザーで動作し、新たな機能と大幅なパフォーマンス向上を提供する新しい種類のコードです。基本的に直接記述ではなく、C、C++、Rust 等の低水準の言語にとって効果的なコンパイル対象となるように設計されています。
この機能はウェブプラットフォームにとって大きな意味を持ちます。ウェブ上で動作するクライアントアプリで従来は実現できなかった、ネイティブ水準の速度で複数の言語で記述されたコードをウェブ上で動作させる方法を提供します。

https://developer.mozilla.org/ja/docs/WebAssembly/Concepts
-->

## Rustをwasm化して実行する主な方法

主に以下の2つがあります。

1. wasm-pack
    * Rustのwasm化において一番メジャーで簡単な方法
    * wasm-unknown-unknownとwasm-bindgenをラップしたツール
    * C/C++に依存していない純粋なRustの場合はこちらがオススメ
1. wasm32-unknown-emscripten
    * emscriptenのインストールが必要
    * C/C++を呼び出している場合はこちらがオススメ

## wasm-pack

Rustのwasm化において一番メジャーで簡単な方法です。wasm-packさえインストールすれば自動で全部やってくれるので非常に楽です。内部ではターゲットをwasm32-unknown-unknownとしてビルドし、wasm-bindgen-cliを用いてグルーコードを生成しています。wasm-bindgenとはJavaScriptとRustの型を繋ぐツールのことです。

**基本的にwasm-packはC/C++を呼んでいる場合は使えないので注意してください。**

### チュートリアル

簡単にwasm-packのチュートリアルを説明します。

1. wasm-packのインストール

    ```sh
    cargo install wasm-pack
    ```

1. プロジェクトの新規作成

    ```sh
    wasm-pack new hello-wasm-pack
    ```

1. ビルド
    targetをwebに指定してビルドを実行します。

    ```sh
    wasm-pack build --target web
    ```

1. wasmの実行
    以下のような`index.html`を作成します。

    ```html index.html
    <!DOCTYPE html>
    <html lang="en-US">

    <head>
        <meta charset="utf-8">
        <title>hello-wasm-pack example</title>
    </head>

    <body>
        <script type="module">
            import init, { greet } from "./pkg/hello_wasm_pack.js";
            init()
                .then(() => {
                    greet("WebAssembly")
                });
        </script>
    </body>

    </html>
    ```

    適当な方法でローカルサーバを立てます。(サーバを立てずにwasmを実行するとCORSエラーが発生します。)
    今回はPythonを使う方法でやってみます。

    ```sh
    python3 -m http.server 8080
    ```

    ブラウザで[http://localhost:8080/](http://localhost:8080/)にアクセスすると画面上にアラートボックスが現れ、`Hello, hello-wasm-pack!`と表示されたら成功です。

<img src="/images/2023/20230602a/スクリーンショット_2023-03-24_18.40.13.png" alt="" width="1200" height="739" loading="lazy">

### wasm-packは何をしてくれているのか

wasm-packはビルド時に以下の処理をしてくれています。

1. Rustコードをwasmにコンパイル
    * `cargo build --target wasm32-unknown-unknown`を実行
(ビルドターゲットにwasm32-unknown-unknownがインストールされていない場合は`rustup target add wasm32-unknown-unknown`を実行してビルドターゲットに追加)
    * ここでコンパイルしたwasmは`target/wasm32-unknown-unknown/release/`に生成される
1. グルーコードの生成
    * `wasm-bindgen-cli`を用いてwasmとjsがデータをやり取りするためのjsファイルを作成し、`pkg`ディレクトリに格納
1. `Cargo.toml`を読んで等価な`pakcage.json`を作成
1. `README.md`が存在する場合は`pkg`にコピー

::: note info
wasm32-unknown-unknownの「wasm32」はアドレス空間が32bitであること、1つ目の「unknown」はコンパイルを行うシステムのこと、2つ目の「unknown」はターゲットとしているシステムのことを示しています。つまり、wasm32-unknown-unknownはコンパイルを行うシステムとターゲットとするシステムの両方に制約がなく、どのような実行環境でも動作することを示します。
:::

### 何故C/C++

完全には理解できませんでしたが、wasm-packはC/C++の標準ライブラリにリンクする機能が含まれていないようです([参考1](https://stackoverflow.com/questions/75025716/can-wasm-pack-compile-a-rust-project-including-c-code-that-uses-stdlib)、[参考2](https://github.com/rustwasm/wasm-pack/issues/741))。

::: note info
C/C++を呼び出しているとwasm-packは使用できないと述べましたが、実は[wasm-packでも頑張ればできる](https://zenn.dev/newgyu/articles/8bff73505c7b35)らしいです。しかし、記事では依存元のソースコードをいじって動くようにしており、できる限り依存元のソースコードは触りたくないため選択肢から除外しました。どうしてもwasm-packを使いたい方はこちらの記事の方法を試してみてはいかがでしょうか。
:::

## wasm32-unknown-emscripten

[emscripten](https://emscripten.org/)のコンパイラ(emcc)を利用してコンパイルを行います。emscriptenとはC/C++をwasmにコンパイルするためのClang/LLVMベースのコンパイラです。
C/C++を呼んでいる場合はこちらの方法をオススメします。

### チュートリアル

1. Python3のインストール
    Python3をインストールしていない方はインストールしてください。
2. emscriptenのインストール
      まずemsdkをインストールします

      ```shell
      git clone https://github.com/emscripten-core/emsdk.git
      ```

      emsdkを利用してemscriptenをインストールします。ここでバージョンを**2.0.24**にしている点に注意してください。(私の環境では最新のemscriptenでは成功しませんでした。)

      ```shell
      cd emsdk
      ./emsdk install 2.0.24
      ```

      emscriptenを有効にします。emccコマンドが実行できれば成功です。

      ```sh
      # 使用しているshellに合わせて実行するスクリプトを適宜変更してください
      source ./emsdk_env.sh
      emcc --version
      # emcc (Emscripten gcc/clang-like replacement + linker emulating GNU ld) 2.0.24 (416685fb964c14cde4be3e8a45ad26d75bac3e33)
      # Copyright (C) 2014 the Emscripten authors (see AUTHORS.txt)
      # This is free and open source software under the MIT license.
      # There is NO warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
      ```

::: note warn
Windowsで[公式ページのインストーラ](https://www.python.org/downloads/)を用いてPythonのインストールを行なっており、かつGit Bashなどを使っている場合はemsdkの実行がうまくいかない場合があります。

WindowsではデフォルトでPython3コマンドが入っていますが、そのコマンドはPython3ではなくMicrosoftのPython3インストールページが起動します。また、[Python公式ページのインストーラ](https://www.python.org/downloads/)を用いてインストールされるPython3は`python`コマンドで起動します。よって、**無効な`python3`コマンドと有効な`python`コマンドが存在している状態になります**。emsdkではまず`python3`コマンドを探し、存在しなければ`python`コマンドを探します。そのため、先に述べた環境の場合は無効な`python3`コマンドが使用されてしまいます。

対応方法は以下の3つです。

1. MicrosoftストアからPython3をインストールする
    * Microsoftストアが使える方はこの方法が正攻法です
    * 業務用PCなどでMicrosoftストアが使えない方は以下の方法を試してみてください
2. emsdkの`python3`コマンドを探す箇所を削除する
    * 力技です
    * [`emsdk/emsdk`の33~39行目](https://github.com/emscripten-core/emsdk/blob/da9699832b5df4e123403490e499c87000c22654/emsdk#L33-L39)を削除するとうまくいきます
:::

3. プロジェクトの新規作成

    ```sh
    cargo new --lib hello-emscripten
    ```

4. ターゲットに`wasm32-unknown-emscripten`を追加

    ```sh
    rustup target add wasm32-unknown-emscripten
    ```

5. `Cargo.toml`を以下のように変更

    ```toml Cargo.toml
    [package]
    name = "hello-emscripten"
    version = "0.1.0"
    edition = "2021"

    [lib]
    crate-type = ["cdylib"]
    ```

6. `src/lib.rs`を以下のように変更

    ```rust src/lib.rs
    use std::ffi::{c_char, CString};

    #[no_mangle]
    pub fn greet(src: *mut c_char) -> *mut c_char {
        let src = unsafe {
            match src.as_mut() {
                Some(src) => {
                    // ポインタからCStringに変換
                    let s = CString::from_raw(src);
                    // CStringからStringに変換
                    s.into_string().unwrap()
                }
                None => "guest".to_owned(),
            }
        };

        let res = format!("Hello, {src}!");
        // Rustの文字列から終端文字がnullのC形式の文字列に変換し、ポインタに変換
        CString::new(res).unwrap().into_raw()
    }
    ```

    [`#[no_mangle]`アトリビュート](https://doc.rust-lang.org/reference/abi.html#the-no_mangle-attribute)を付与することで関数名をマングリングしないようにできます。マングリングとはコンパイラが関数名などをユニークな名前に変更することです。(例: `int Add(int a, int b)` →  `_Z3Addii`)
    今回の例では関数greetの名前を勝手に変更してほしくないので`#[no_mangle]`属性を付与しています。

7. `build.sh`の作成
    プロジェクトのルートディレクトリに`build.sh`を作成します。

    ```sh build.sh
    # 自分の環境のemsdkの場所に合わせてパスに書き換えてください
    # 使用しているshellに合わせて実行するスクリプトを適宜変更してください
    # emccを有効にする
    source ../emsdk/emsdk_env.sh

    # emccの設定
    export EMCC_CFLAGS="-o hello-emscripten.js
                        -s EXPORTED_FUNCTIONS=['_greet']
                        -s EXPORTED_RUNTIME_METHODS=ccall"
    # ビルド
    cargo build --target wasm32-unknown-emscripten --release
    ```

    emccの設定の詳細は以下の通りです。ドキュメントは[こちら](https://emscripten.org/docs/tools_reference/emcc.html)。

|オプション|説明||
|-|-|-|
|-o hello-emscripten.js|jsのグルーコードを出力する|<a href="https://emscripten.org/docs/tools_reference/emcc.html#:~:text=when%20cross%2Dcompiling).-,%2Do%20%3Ctarget%3E,-%5Blink%5D%20When%20linking">リンク</a> |
|-s EXPORTED_FUNCTIONS=['_greet']|エクスポートする関数の指定|[リンク](https://github.com/emscripten-core/emscripten/blob/fab93a2bff6273c882b0c7fb7b54eccc37276e03/src/settings.js#L969-L978)|
|-s EXPORTED_RUNTIME_METHODS=ccall|エクスポートするランタイムメソッドの指定|[リンク](https://github.com/emscripten-core/emscripten/blob/fab93a2bff6273c882b0c7fb7b54eccc37276e03/src/settings.js#L868-L875)|

8. ビルドの実行

    ```sh
    source build.sh
    ```

    実行が完了するとプロジェクトのルートディレクトリに`hello-emscripten.js`、`hello-emscripten.wasm`というファイルが生成されます。

9. `index.html`の作成
    以下のような`index.html`を作成します

    ```html index.html
    <html>

    <body>
        <!-- グルーコードの読み込み -->
        <script async src=hello-emscripten.js></script>

        <div style="text-align: center">
            <textarea id="name" rows="10" cols="30"></textarea>
        </div>
        <div style="text-align: center">
            <input type="button" value="greet" id="greet" />
        </div>
        <script>
            Module = {}
            Module["onRuntimeInitialized"] = function () {
                const name = document.getElementById("name");
                const button = document.getElementById("greet");
                button.addEventListener("click", (event) => {
                    const target = name.value;
                    const res = ccall("greet", "string", ["string"], [target]);
                    console.log(res);
                });
            };
        </script>
    </body>

    </html>
    ```

10. 実行
    適当な方法でローカルサーバを立てます。今回はPythonを使う方法でやってみます。

    ```sh
    python3 -m http.server 8080
    ```

    ブラウザで[http://localhost:8080/](http://localhost:8080/)にアクセスすると以下のようなページが表示されます。
<img src="/images/2023/20230602a/スクリーンショット_2023-03-24_15.53.38.png" alt="greet" width="986" height="624" loading="lazy">
    テキストボックスに適当なテキストを入力し、下部のボタンを押します。
    コンソールに"Hello, (入力したテキスト)!"と表示されれば成功です。

<img src="/images/2023/20230602a/スクリーンショット_2023-03-24_15.59.58.png" alt="Hello, Tom!" width="917" height="611" loading="lazy">

## SQLフォーマッタのwasm化をやってみる

私たちが作成したRust製SQLフォーマッタ(uroborosql-fmt)のwasm化をやってみます。

フォーマッタはCで書かれたtree-sitterに依存しているため、今回は先ほど紹介したemscriptenを使う方法でwasm化を行います。方法は先述したチュートリアルとほぼ同じなので詳細は割愛しますが、ビルド用シェルスクリプトは少し変更を加えたため説明します。

ビルド用シェルスクリプトを変更した理由は、依存しているプロジェクトであるtree-sitter-sql(tree-sitterのSQL文法)のビルドにおいて、`EMCC_CFLAGS="-o uroborosql-fmt.html"`のようにhtmlを出力する設定にしていると失敗してしまったためです。調査しましたが原因不明であったため、とりあえずtree-sitter-sqlだけ先にビルドし、その後にemccの設定を変更し、最後に全体のビルドを行うアプローチを取りました。

`cargo build`に`-vv`を付与(["very verbose"モード](https://doc.rust-lang.org/cargo/reference/build-scripts.html#:~:text=If%20you%20would%20like%20to%20see%20the%20output%20directly%20in%20your%20terminal%2C%20invoke%20Cargo%20as%20%22very%20verbose%22%20with%20the%20%2Dvv%20flag.)、処理の詳細が出力される)して確認したところ、各ビルドでは以下のような処理を行なっていることがわかりました。

1. 1回目のビルド
    * tree-sitter-sqlとそれに依存するライブラリをビルド、このときオブジェクトファイル等(\*.a 、\*.o )が生成される
2. 2回目のビルド
    * uroborosql-fmtに依存するライブラリをビルド、このときtree-sitter-sqlはビルド済みとしてスキップ
    * uroborosql-fmtをコンパイルするときに依存するライブラリのオブジェクトファイル等があるパスがrustcに渡され、そこからオブジェクトファイル等を検索してまとめてwasm化する

```sh build.sh
# 自分の環境のemsdk/emsdk_env.shのパスに書き換えてください
# emccを有効にする
source ../emsdk/emsdk_env.sh

# emccの設定変更
export EMCC_CFLAGS="-O3"
# tree-sitter-sqlのビルドを実行
cargo build --package tree-sitter-sql --target wasm32-unknown-emscripten --release

# emccの設定変更
export EMCC_CFLAGS="-O3 -o uroborosql-fmt.js -s EXPORTED_FUNCTIONS=['_format_sql'] -s ALLOW_MEMORY_GROWTH=1 -s EXPORTED_RUNTIME_METHODS=ccall"
# 全体のビルドを実行
cargo build --target wasm32-unknown-emscripten --release
```

|オプション|説明||
|-|-|-|
|-O3|最高レベルの最適化|[リンク](https://emscripten.org/docs/tools_reference/emcc.html#:~:text=settings.js.-,%2DO3,-%5Bcompile%2Blink%5D%20Like)|
|-o uroborosql-fmt.js|jsのグルーコードを出力する|<a href="https://emscripten.org/docs/tools_reference/emcc.html#:~:text=when%20cross%2Dcompiling).-,%2Do%20%3Ctarget%3E,-%5Blink%5D%20When%20linking">リンク</a> |
|-s EXPORTED_FUNCTIONS=['_format_sql']|エクスポートする関数の指定|[リンク](https://github.com/emscripten-core/emscripten/blob/fab93a2bff6273c882b0c7fb7b54eccc37276e03/src/settings.js#L969-L978)|
|-s ALLOW_MEMORY_GROWTH=1|動的にメモリを増やす|[リンク](https://github.com/emscripten-core/emscripten/blob/fab93a2bff6273c882b0c7fb7b54eccc37276e03/src/settings.js#L177-L190)|
|-s EXPORTED_RUNTIME_METHODS=ccall|エクスポートするランタイムメソッドの指定|[リンク](https://github.com/emscripten-core/emscripten/blob/fab93a2bff6273c882b0c7fb7b54eccc37276e03/src/settings.js#L868-L875)|

今回はSQLフォーマッタなので、動的にメモリを確保する方法を選択しました。ちなみにメモリサイズのデフォルトの初期値は16MB、最大値は2GBで、こちらもオプション(`INITIAL_MEMORY`, `MAXIMUM_MEMORY`)で変更できます。

::: note info
私の環境では大差は見られませんでしたが、動的にメモリを確保する方法は重くなる可能性があるらしい([参考](https://bugs.chromium.org/p/v8/issues/detail?id=3907))ので、動的にメモリを確保する必要がないサービスの場合は避けた方が良いかもしれません。
:::

ローカルサーバを立てて実行してみるとちゃんと動きました 🎉
<img src="/images/2023/20230602a/format.gif" alt="format.gif" width="1200" height="675" loading="lazy">

## 速度検証

napi-rsを用いてNodeアドオン化して拡張機能に載せたフォーマッタ(詳細は[こちら](https://future-architect.github.io/articles/20221228a/))と今回作成したwasmで実行時間の計測を行なってみました。

最適化なしのwasmはビルドの際に`--release`を付与せずにビルドしたものです。

### 検証方法

* フォーマット部分のみの時間を計測
* 10200行のSQLを使用
* 20回実行して90パーセンタイルを取得

### 検証結果

結果は以下のようになりました。

|種類|時間(ms)|
|-|-|
|napi-rs|73.89|
|wasm |171.10|

他の方の調査([1]([https://namazu-tech.hatenablog.com/entry/2017/12/02/012600]), [2](https://niba1122.dev/js-wasm-benchmark/), [3](https://t-yng.jp/post/wasm-othello), [4](http://nmi.jp/2022-05-14-Dynamically-created-WebAssembly))ではwasmはネイティブレベルかそれ以上の性能を叩き出していたので、wasmの方が2倍ほど遅いと言う結果は意外でした。しかし、遅いと言っても10200行のSQLで171msなので十分実用的な速度だと思います。

## 最適化検証

Rustの[最適化レベル](https://doc.rust-lang.org/cargo/reference/profiles.html)を変更してサイズ、速度の調査を行います。検証方法は速度検証と同様です。

### 検証結果

|種類|説明|サイズ(KB)|時間(ms)|
|-|-|-|-|
|0|最適化なし|1392|428.70|
|1|基本的な速度最適化|1178|207.90|
|2|いくつかの速度最適化|1122|177.70|
|3|全ての速度最適化(リリースモードのデフォルト)|1124|171.10|
|"s"|バイナリサイズの最適化|1113|218.80|
|"z"|バイナリサイズの最適化+ループのベクトル化もオフ|1111|300.40|

今回のケースではサイズの最適化を行なってもwasmのサイズに大きな変化は見られませんでした。

## まとめ

C/C++を呼び出しているRustのwasm化について説明しました。

本記事には書きませんでしたが、tree-sitter-sqlのパーササイズが大きすぎてコンパイルできない問題などにも遭遇して非常に苦戦していました。最終的にはなんとかwasm化できたのでよかったです。同様の問題を抱えている方の助けになれば幸いです。

## 参考文献

* [WebAssembly | MDN](https://developer.mozilla.org/ja/docs/WebAssembly)
* [WebAssemblyとは - Qiita](https://qiita.com/ShuntaShirai/items/3ac92412720789576f22)
* [C言語へのFFIを含むRustをWASM化するのは難しすぎる](https://zenn.dev/newgyu/articles/4240df5d2a7d55)
* [C言語へのFFIを含むRustコードをWASMにする（CMakeを添えて）](https://zenn.dev/newgyu/articles/8bff73505c7b35)
* [興味のおもむくままにWASM/WASIらへん](https://zenn.dev/newgyu/scraps/ffbce244b960e6)
* [Rust における wasm-bindgen と wasm-pack と cargo-web と stdweb の違い - Qiita](https://qiita.com/legokichi/items/5d6344314ab6d6633554)
* [Main — Emscripten 3.1.33-git (dev) documentation](https://emscripten.org/)
* [WebAssemblyが気になるので調べてみた - Qiita](https://qiita.com/t_katsumura/items/ff379aaaba6931aad1c4)
* [Emitting ES6 Module for \`wasm32-unknown-emscripten\` - help - The Rust Programming Language Forum](https://users.rust-lang.org/t/emitting-es6-module-for-wasm32-unknown-emscripten/84684/11)
* [C/C++を使っているRustのコンソールアプリのReact SPA化 - Qiita](https://qiita.com/kzee/items/216bd1dd2b1330642e23)
