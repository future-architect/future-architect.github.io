---
title: "Blazor WebAssembly入門"
date: 2022/04/12 00:00:00
postid: a
tag:
  - WebAssembly
  - C#
category:
  - Frontend
thumbnail: /images/2022/20220412a/thumbnail.png
author: 清水
lede: "WebおよびモバイルインターフェースのプロトタイプアプリをBlazor WebAssemblyを用いて開発した経験を通して感じたことなどを簡単に紹介したいと思います。Blazor WebAssemblyとは..."
---
# はじめに

FutureOne株式会社 テクノロジー本部の清水です。

FutureOneはフューチャーグループの中で、中堅・中小企業様向けのERPパッケージを展開している会社となります。
弊社ERPパッケージの特色の1つとしては、弊社独自開発プラットフォームにより、中小企業様でも各企業様のビジネス・商習慣に合わせた柔軟なカスタマイズが可能な点があります。定型的な業務にはパッケージ標準機能にて効率化を図り、競争力・工夫が求められる業務にはお客様の要望をカスタマイズにて提供可能な、ハイブリッドなERPパッケージとなっています。

今回は、新たに弊社ERPパッケージのクラウド型提供で追加される、WebおよびモバイルインタフェースのプロトタイプアプリをBlazor WebAssemblyを用いて開発した経験を通して感じたことなどを簡単に紹介したいと思います。

## Blazor WebAssemblyとは

まず始めに、`WebAssembly`の基本について紹介します。
`WebAssembly`とは、ブラウザ上でネイティブコードに近い実行速度で高速に実行できるバイナリフォーマットです。
W3CのWebAssembly Working Groupによって2019年12月5日に勧告され、正式なWeb標準仕様となりました。詳細は以下で確認できます。

* [World Wide Web Consortium (W3C) brings a new language to the Web as WebAssembly becomes a W3C Recommendation | W3C](https://www.w3.org/2019/12/pressrelease-wasm-rec.html.en)
* [WebAssembly の概要 | mdn web docs](https://developer.moSnapCrab_DevTools-localhost7065_2022-3-29_10-24-46_No-00zilla.org/ja/docs/WebAssembly/Concepts)
* [WebAssemblyがW3Cの勧告に到達。「WebAssembly Core Specification 」「WebAssembly Web API」「WebAssembly JavaScript Interface 」の3つ | Publickey](https://www.publickey1.jp/blog/19/webassemblyw3cwebassembly_core_specification_webassembly_web_apiwebassembly_javascript_interface_3.html)

現在は、C言語、C++、Rust、Go、Kotlin/Native、C#などが対応しています。

Blazor WebAssemblyは、.NETランタイムやアプリケーションコードが全て`WebAssembly`にコンパイルされ、コンパイル結果（アセンブリ）をダウンロードしたブラウザ上で実行するフレームワークです。

アプリケーション開発者は、従来JavaScriptを用いて記述していたフロントエンド側のスクリプト処理を、C#言語を用いて開発できるのです。また、このフレームワークで開発されたアプリケーションは **Single Page Application（SPA）** でもあります。
Blazorには「Blazor WebAssembly」と「Blazor Sever」の２種類ありますが、今回は前者に焦点を充てて紹介します。

## プロトタイプアプリの概要

今回の取り組みの発端は、弊社のERPパッケージはリッチクライアント画面となっているのですが、そこに冒頭のWebおよびモバイルインタフェースを追加するといった自分も含めた色んな人の要望から始まりました。

1stステップのアプリケーションの要件を簡単にまとめると以下のようになりました。

* まずは既存のERPパッケージのデータベースを参照し、売上情報などの情報を見れるようにしたい。
* モバイルやPCなどクロスプラットフォームとしたい。

## Blazor WebAssembly採用の背景とメリット・デメリット

Blazor WebAssemblyを採用した背景としては、面白そうな技術要素で、かつ開発に時間をかけずにクイックに動くものを見せて欲しいという依頼がリーダーからあり、私が通常業務でC#を扱っている点や弊社内には.NET系のエンジニアが多数在籍している点からBlazor WebAssemblyを選択しました。

ざっくりとBlazor WebAssemblyのメリットとデメリットを主観含め挙げます。

* メリット（弊社にとって馴染みのある技術が利用できる）
  * フロントエンド（のスクリプト処理）およびバックエンドをC#で記述できる。
    * もちろんHTML、CSSの知識は必要です。
  * Visual Studioさえあれば開発可能である。
    * 何ならIISやAzure App ServiceへVisual Studioから直接デプロイできる。
  * Azure App Service（Azure のWebアプリホスティングサービス）がBlazor WebAssemblyへ対応している。
  * SPAで避けて通れないユーザ認証サービスとして、Azure Active Directoryが対応している。
    * また、実装方法に関する公式ドキュメントが、Microsoft社に依頼せずともオープンに充実している。
  * Microsoft社が今推しのフレームワークで、積極的に開発が進んでいる。
    * ASP.NET Web Forms アプリからの移行先候補の1つでもある。
* デメリット（まだ新しい）
  * 登場したばかり。採用実績に乏しい。
  * 標準のUIコンポーネントが圧倒的に少ない。
  * OSSのUIコンポーネントも圧倒的に少ない。
  * アセンブリのダウンロードに時間がかかる。

メリットについては、要はクイックなプロトタイプ開発、その後の保守の観点で弊社でやり易い点なのですが、デメリットについては、新規フレームワークということで、エコシステム界隈が充実してない点にある印象です。

## 開発の始め方

では、ここからはBlazor WebAssemblyのアプリケーション開発方法を簡単に紹介します。
次のコマンドを実行すると、プロジェクトテンプレートに基づき、プロジェクトファイル一式が作成されます。
※もちろんコマンドプロンプトからでなくVisual StudioのGUIから作成できます。

```cmd
>dotnet new blazorwasm -ho -o future_one_demo
テンプレート "Blazor WebAssembly App" が正常に作成されました。
このテンプレートには、Microsoft 以外のパーティのテクノロジが含まれています。詳しくは、https://aka.ms/aspnetcore/6.0-third-party-notices をご覧ください。

作成後の操作を処理しています...
D:\xxx\future_one_demo\future_one_demo.sln で ' dotnet restore ' を実行しています...
  復元対象のプロジェクトを決定しています...
  D:\xxx\future_one_demo\Shared\future_one_demo.Shared.csproj を復元しました (95 ms)。
  D:\xxx\future_one_demo\Client\future_one_demo.Client.csproj を復元しました (1.71 sec)。
  D:\xxx\future_one_demo\Server\future_one_demo.Server.csproj を復元しました (1.71 sec)。
正常に復元されました。
```

## プロジェクト構成

作成されたプロジェクトを見てみます。
以下のように`Client/Server/Share`と役割が容易に分かるようにプロジェクトが構成されています。
フロントエンドとバックエンドで開発部署が分かれているの場合などに好ましい構成ですね。

<img src="/images/2022/20220412a/プロジェクト構成.png" alt="プロジェクト構成.png" width="302" height="760" loading="lazy">

`Client`フォルダはフロントエンドのプロジェクトです。拡張子が`.razor`のファイルがありますが、これはRazorコンポーネントと呼ばれており、コンポーネントを組み合わせてWebページを作成するイメージとなります。[^1]

`Server`フォルダはバックエンドのプロジェクトです。Blazor WebAssembly専用とかではなく、純粋なASP.NET Core Web APIアプリケーションです。
`Microsoft.AspNetCore.Mvc.ControllerBase`を継承したコントローラクラスを定義します。
お馴染みですね。

`Shared`フォルダは`Client`と`Server`で共通するコードを定義するプロジェクトです。
デフォルトでは`Client`と`Server`の間でHTTPリクエスト／レスポンスでやり取りするデータクラスが定義されています。
Vue.jsなどで起こりがちな`Client`と`Server`でデータクラスを個々に定義せざるを得ない問題を防げるという点もBlazor WebAssemblyのメリットの1つかもしれません。

## 実行してみる

アプリを起動してみます。左がデスクトップPCの表示。右はモバイル端末の表示です。
デフォルトでレスポンシブデザインが採用されている点も良いです。

<img src="/images/2022/20220412a/アプリ.png" alt="アプリ.png" width="1200" height="749" loading="lazy">

アプリを起動した直後、ブラウザのDevToolsで見たネットワークの状態です。
`System.xxx.dll`という.NETランタイムのアセンブリ群がダウンロードされていることが分かります。全体のサイズで約4MBでした（参考：.NET SDK v6.0.201）

モバイルなど非力な端末の場合、ネックになるかもしれません。

<img src="/images/2022/20220412a/DevTools.png" alt="DevTools.png" width="954" height="710" loading="lazy">

ただし、２回目以降に起動した際はダウンロードは発生しません。ランタイム関係のアセンブリはキャッシュストレージへ保存され、キャッシュしたものが使われているようです。この辺りは工夫がされているのですね。

<img src="/images/2022/20220412a/DevTools_2.png" alt="DevTools.png" width="872" height="724" loading="lazy">

DevToolsのソースを見てます。
`_framework`コンテンツ内に複数の`.js`ファイルがあります。
また、`wasm`内には`WebAssembly`のテキストコードのようなものがあります。
この辺りは深追いしておりませんが、本格的に仕組みを理解したい場合はこの辺りを研究する必要がありそうです。

<img src="/images/2022/20220412a/DevTools_3.png" alt="DevTools.png" width="956" height="850" loading="lazy">

## 開発ポイント

ここからはBlazor WebAssmblyの開発で理解しておいた方が良いポイントを挙げてゆきます。
なお、RazorコンポーネントはRazor構文という独自の文法でコードを記述しますが、文法の詳細については割愛します。

### ライフサイクルイベント

Blazorは基本的にイベント駆動型で、イベントハンドラに処理を実装してゆきます。
その中で重要なのがRazorコンポーネントのライフサイクルイベントです。

* `SetParametersAsync`：パラメーターが設定されるタイミングに呼び出されます。
* `OnInitialized{Async}`：コンポーネントの初期化時に呼び出されます。
* `OnParametersSet{Async}`：パラメーターが設定された後に呼び出されます。
* `OnAfterRender{Async}`：コンポーネントのレンダリング後に呼び出されます。

必要に応じてコンポーネントの初期化やパラメータの受け渡し時の処理を実装する必要があります。

以下の公式ドキュメントが参考になります。
[ASP.NET Core Razor コンポーネントのライフサイクル | Microsoft Docs](https://docs.microsoft.com/ja-jp/aspnet/core/blazor/components/lifecycle?view=aspnetcore-6.0)

### 画面の状態更新

Razorコンポーネントには画面のコンポーネントの状態変更を通知するための`StateHasChanged`メソッドというものがあります。
以下のシナリオにおいて`StateHasChanged`メソッドの呼び出しが必要になる場合があります。

1. 非同期I/O呼び出し（HTTPリクエストなど）の結果を受け取って画面へ結果を反映する。
2. UIスレッド以外のスレッド上から画面の要素を更新する。
3. あるシングルトンなインスタンスを複数コンポーネントが参照し状態変更を観察（Subscribe）する。そのシングルトンインスタンスの状態を参照する全画面へ反映する。
    * 次のMicrosoft Docsの中で紹介されているコードで`StateHasChanged`メソッド呼び出しをコメントアウトすると、期待通り動きません。
      * [メモリ内状態コンテナー サービス | Microsoft Docs](https://docs.microsoft.com/ja-jp/aspnet/core/blazor/state-management?view=aspnetcore-6.0&pivots=webassembly#in-memory-state-container-service-wasm)
4. 上記以外にもあるかもしれません。

以下は「2. UIスレッド以外のスレッド上から画面の要素を更新する」の例です。
UIスレッド外のタイマから１秒ごとに現在時刻を画面へ反映する処理です（実際にこのような機能を必要とするかどうかは別ですが）。。
`Elapsed`イベントハンドラ内で`StateHasChanged`メソッドを呼び出していますが、この行をコメントアウトすると期待通りに動きません（現在時刻が変わりません）。

```c#
@page "/timersample"
<p>Now Time: [@_nowTime]</p>
@code {
    private Timer _timer = new Timer(1000);
    protected override void OnInitialized()
    {
        _timer.Elapsed += (sender, e) =>
        {
            _nowTime = DateTime.Now.ToString();
            StateHasChanged(); //コメントアウトすると動きません。
        };
        _timer.Start();
    }
    ...
}
```

アプリケーション開発者が「`StateHasChanged`メソッドの呼び出しの必要性を判断しなければならない」という点はBlazor WebAssemblyのデメリットの1つかもしれません。
私が調べた範囲ではVue.jsはこのような配慮が必要ではないため、イケてないなぁという印象です。

### 状態管理について

SPAにて度々議題にあがる（と私が思っている）「アプリケーションの状態管理」についててす。
先述した[メモリ内状態コンテナー サービス | Microsoft Docs](https://docs.microsoft.com/ja-jp/aspnet/core/blazor/state-management?view=aspnetcore-6.0&pivots=webassembly#in-memory-state-container-service-wasm)で、Microsoft社の解説があります。

以下のようなコンテナクラスを定義します。

```c#
//StateContainer.cs
public class StateContainer
{
    private string? savedString;

    public string Property
    {
        get => savedString ?? string.Empty;
        set
        {
            savedString = value;
            NotifyStateChanged();
        }
    }

    public event Action? OnChange;

    private void NotifyStateChanged() => OnChange?.Invoke();
}
```

状態を観察するコンポーネント側は以下のような感じです。このようなコンポーネントが複数あるイメージです。

```c#
//Pages/StateContainerExample.razor
@page "/state-container-example"
@implements IDisposable
@inject StateContainer StateContainer

<h1>State Container Example component</h1>

<p>State Container component Property: <b>@StateContainer.Property</b></p>

<p>
    <button @onclick="ChangePropertyValue">
        Change the Property from the State Container Example component
    </button>
</p>

<Nested />

@code {
    protected override void OnInitialized()
     =>  StateContainer.OnChange += StateHasChanged;

    private void ChangePropertyValue()
    {
        StateContainer.Property = "New value set in the State " +
            $"Container Example component: {DateTime.Now}";
    }

    public void Dispose()
     => StateContainer.OnChange -= StateHasChanged;
}
```

一般的には「Fluxアーキテクチャ」が提唱されており、Vue.jsではVuex、RactではReduxといったライブラリが有名かと思います。
Blazor WebAssemblyでの「Fluxアーキテクチャ」のライブラリも存在するようです。
[mrpmorris/Fluxor | Github](https://github.com/mrpmorris/Fluxor)

今回のプロトタイプアプリではFluxorの採用は見送りました。
詳細は省きますがMicrosoft社さんの解説手法にひと工夫をした形で採用することとしました。
この辺りについては今後研究の余地がありそうです。

## まとめ

最後に簡単にまとめます。

* Blazor WebAssmblyではC#を使いWebアプリケーションが開発できる。
* Visual Studioから開発が簡単にできる。
* Razorコンポーネントのライフサイクルイベントや`StateHasChanged`の仕組みは理解した方が良い。
* 一方で`WebAssembly`の内部的な仕組みを理解せずともWebアプリケーションが開発可能である。

特に最後の点について、`WebAssembly`だからといってその仕様や機械語レベルの理解する必要は殆どなく、
高級言語から機械語への翻訳はコンパイラに全てお任せ、開発者は馴染みのある高級言語でWebアプリ開発に注力でき、Blazor WebAssemblyはC#を用いてWebアプリケーションを開発できる点が一番のメリットなのかなぁと感じました。
Blazor WebAssmblyを今後使用される方の一助になれば幸いです。

[^1]: BlazorではなくRazorです。紛らわしいですがそういうものらしいです。
