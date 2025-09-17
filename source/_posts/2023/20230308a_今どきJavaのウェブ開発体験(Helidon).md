---
title: "今どきJavaのウェブ開発体験(Helidon)"
date: 2023/03/08 00:00:00
postid: a
tag:
  - Java
  - コンテナビルド
category:
  - Programming
thumbnail: /images/2023/20230308a/thumbnail.png
author: 澁川喜規
lede: "JavaでWebサービス開発というと、SpringBoot、という時代が長く続いていますが、Javaの世界もいろいろ進歩があるよ、ということで、MicroProfileというのを教えてもらいました。豆蔵さんの技術ブログや、masatarouさんのJJUGのレポートが詳しいです。"
---
JavaでWebサービス開発というと、SpringBoot、という時代が長く続いていますが、Javaの世界もいろいろ進歩があるよ、ということで、MicroProfileというのを教えてもらいました。

豆蔵さんの技術ブログや、masatarouさんのJJUGのレポートが詳しいです。

* [MicroProfileってなにそれ？ - MicroProfileの登場](https://developer.mamezou-tech.com/msa/mp/cntrn01-what-mp/)
* [JJUGナイトセミナー　メモ２（JakartaEE・MicroProfile）](https://qiita.com/masatarou/items/fd17d37c8d215af082f5)

歴史的な経緯をまとめるとこんな感じですかね。

* Javaのウェブアプリケーション開発の基盤としてJava EE（昔の名前はJ2EE）があった
* 2016年により活発な開発を求めて、Eclipse FoundationがJava EEをフォークしてMicroProfileを作った
* 2017年にOracleはJava EEをEclipse Foundationに移管を発表し、JakartaEEとなることを発表
* 2019年にJakartaEE 8がリリース
* 2020年にMicroProfileの最初のJakartaEE準拠版の4.0がリリース
* 2022年にJakartaEE 10 Core Profileを内包したMicroProfile 6.0がリリース

フォークしたけど、どちらもEclipse Foundationに入り、2020年からは仲良く歩調を合わせている、という感じですかね。Java EEやJakartaEEは過去との互換性を重視している感じで、MicroProfileの方はイケイケな感じということを当初狙っていたみたいですが、2022年12月に出た6.0では、含まれるプロファイルにJakartaEE 10 Core Profileという文字が見えます。

<img src="/images/2023/20230308a/スクリーンショット_2023-02-21_18.44.43.png" alt="スクリーンショット_2023-02-21_18.44.43.png" width="1200" height="447" loading="lazy">

これまではJakartaEEの要素でもあったJSON-B、JSON-P、JAX-RS、CDIなどが個別に指定されていたのですが、最新版ではJakartaEE 10とも歩調を合わせた、と言う感じみたいです。それにしても、OpenTelemetry対応とか、イケイケですね。参考までにMicroProfile 5.0はこんな感じ。

<img src="/images/2023/20230308a/スクリーンショット_2023-02-21_18.48.43.png" alt="スクリーンショット_2023-02-21_18.48.43.png" width="1200" height="428" loading="lazy">

ソフトウェアの歴史で何度か見たことがあるような流れではあります。[Jakarta EE 10の仕様の構成要素の図](https://jakarta.ee/release/10/)にMicroProfile 6.0の項目も合わせてみたのが以下の図です。クラウドネイティブなフレームワークとなるために、どのような部分を切りすてて、何が必要とされているのかが一目瞭然ですね。これは他の言語のユーザーがフレームワークを考えるうえでも興味深い図なんじゃないでしょうか？ ちょっと補足すると、Interceptorsというのは他の言語のフレームワークではDIコンテナと呼んでいるやつですね。

<img src="/images/2023/20230308a/image.png" alt="image.png" width="870" height="684" loading="lazy">

# Helidon

MicroProfile準拠のウェブアプリケーションフレームワークは、[Quarkus](https://quarkus.io/)(Red Hat), [Helidon](https://helidon.io/)(Oracle), [Open Liberty](https://openliberty.io/)(IBM)などたくさん出ています。ただし、対応するMicroProfileのバージョンは微妙に違うようです。

MicroProfileに準拠していれば、Webサービスのパスや、リクエストやレスポンスの定義、DIコンテナなどのアノテーションはどれも同じように使えるようです。フレームワークが変わってもアプリケーションの実装をほとんど変えなくて済む、と。前述のJJUGナイトセミナーのレポートを見ると、ストレージ周りに組み込まれている機能とかがフレームワークによって個性があるみたいですね。

まあ、他の言語ユーザーからすると、ここまでフレームワーク間で画一的にしないで、個性を発揮してくれてもいいのに・・・という思いはあったりしますが、J2EEを引き継いでいるからですかね。

HelidonはOracleが開発しているウェブアプリケーションサーバーのフレームワークです。MicroProfileの対応バージョンは5.0と最新よりはちょっと古いぐらいですが、Oracleが開発しているので、いろいろアドバンスな感じが期待できそうです。

Helidonには2つのフレーバーがあります。[迷ったらMPの方を使え](https://helidon.io/docs/v3/#/about/introduction:~:text=flavor%20to%20use%20%E2%80%93-,use%20Helidon%20MP.,-Prerequisites)、とドキュメントにはあります。Helidon SEはLambdaみたいなやつで、複数のハンドラを持っていてパス違いで起動し分けるルーターが不要な場合に良さそうです。今回はMicroProfileが目的なのでMPの方で作ってみました。

* Helidon SE: スパルタンな軽量サーバー
* Helidon MP: MicroProfile互換のサーバー

# Helidon MPの環境設定

[Helidon Starter](https://helidon.io/starter/3.1.1?step=1)というWebサイトがあり、ここをぽちぽちするだけでプロジェクトの雛形ができあがります。Spring Starterみたいですね。それ以外にも、[helidon CLI](https://helidon.io/docs/v3/#/about/cli)というのがあり、今時なシンプルコマンドラインでビルドしたりができます。mvnとかgradleを叩く必要はなくなります。

インストールはバイナリを落としてきてパスを通すだけです。init/dev/buildのサブコマンドだけで色々できるようになります。

```bash
# プロジェクト作成
$ helidon init

# 開発サーバー起動
$ helidon dev

# jarビルド
$ helidon build
```

# Helidonのコードを見てみる

``helidon init``で出来上がったプロジェクトを見てみます。Helidon MPを使うよとか、パッケージ名とかを適当に入れるだけでできます。Spring Starterよりもかなりシンプルです（ウェブに特化していてSpring Batchとかそういうバリエーションがないからですが）。

出来上がったコードは、全部が1カ所にまとまっています。パッケージを細かく分けるとか、レイヤードアーキテクチャのレイヤーをパッケージとして分ける、というのはもう今時ではないみたいですね。

```
src/main/java/me/shibu/mp/quickstart
  GreetResource.java
  GreetingProvider.java
  Message.java
  SimpleGreetResource.java
  package-info.java
```

`GreetingProvider`はリポジトリ層というかサービス層というか、ですかね。いわゆるビジネスロジック。まあオンメモリで保存して返しているだけの実装になっています。`Message`は、値オブジェクトというか、構造体というか、単なる箱です。

2つ`Resource`がついているクラスがあります。これはSpringでいういわゆる「コントローラ」ですね。コメントとか省いてシンプルにしていくと、こんな感じです。SpringBootを見たことがある人にはだいたい見たことがあるものですね。

他の言語を使ったことがある人も`@Path/@GET/@Produces`あたりは見てすぐわかりますね。`@RequestScoped/@Inject`はDIコンテナのアノテーションっぽいですね。クラスのライフサイクルの指示と、このコンストラクタ起動時に`GreetingProvider`のインスタンスを作って渡してね、というDIコンテナへの指示かと思います。

```java GreetingProvider.java
@Path("/greet")
@RequestScoped
public class GreetResource {
    private final GreetingProvider greetingProvider;

    @Inject
    public GreetResource(GreetingProvider greetingConfig) {
        this.greetingProvider = greetingConfig;
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Message getDefaultMessage() {
        return createResponse("World");
    }
    // 省略
}

```

実行は`helidon dev`コマンドで行えます。デバッグモード起動です。`helidon build`して`java -jar target/[アプリケーション].jar`でもいけます。Go並に簡単。

# コンテナのビルド

すでにjarへのビルドは触れました。コンテナのビルドもDockerfileが生成されているので簡単です。Dockerfileは3つあり、今時のJavaのアップデートの恩恵が受けられます。

```bash
# JDKでjarを起動するイメージ
$ docker build .

# jlinkで小さいランタイムを生成してjarを起動するイメージ
$ docker build -f Dockerfile.jlink .

# GraalVMでネイティブイメージを生成
$ docker build -f Dockerfile.native .
```

実行してみると、ネイティブビルドはなんかエラーが出てしまったのですが、GitHubで教えてもらった対策でビルドができました（次節で説明します）。レスポンスが早くもらえるのは嬉しいですね。エコシステム大事。

デフォルトのjar版は417MBが、jlink版が126MB、GraalVM版が186MBでした。GraalVMがちょっと大きいですが、jlinkのベースの`debian:stretch-slim`が50MBで、GraalVM版の`ghcr.io/oracle/oraclelinux:9-slim`が107MBで、ベースイメージの差であって上の部分のサイズはだいたい同じぐらいですね。

GraalVM版は圧倒的な起動の速さですし、消費メモリも少ないです。気になるビルド時間は手元のM2 Airでダウンロード周りが20秒、ネイティブ実行イメージ生成が110秒ぐらいですね。まあCI環境だけでやるならいいんじゃないでしょうか？ とはいえ、JVM版、jlink版もそこまで起動は遅くはないです。

思ったよりもいいな、と思ったのがjlink版。300MBぐらい小さいイメージになったし、ビルドも実行もそんなに遅くないです。とりあえず手元でコンテナをさっと作ってローカル結合テストをするときはjlink版で、本番環境に撒く前提だったり、ステージングでテストする場合にGraalVMと使い分けるのが良さそうですね。

|  | JVM(jar) | jlink | GraalVM(native) |
|:-:|:-:|:-:|:-:|
| Dockerイメージサイズ | 417MB | 126MB | 186MB |
| Dockerイメージビルド時間(ベースイメージダウンロード除く)  | 21秒 | 42秒 | 165秒 |
| Docker起動時間(HTTPリクエスト受付開始まで)  | 1.2秒  | 1.2秒 | 0.4秒 |
| 起動後のメモリ(Docker上で計測/100回リクエスト後)  | 180MB  | 176MB  | 85MB |

起動時間は以下のGoアプリコードでやりました。dockerコマンドと同時に走らせて、HTTPリクエストが受付開始されて正常なレスポンスが返ってくるまでの時間を10ms単位で計測しています。

```go bench.go
package main

import (
	"fmt"
	"net/http"
	"time"
)

func main() {
	start := time.Now()
	t := time.NewTicker(10 * time.Millisecond)
	for {
		now := <-t.C
		_, err := http.Get("http://localhost:8080/greet")
		if err != nil {
			continue
		}
		fmt.Println(now.Sub(start))
		return
	}
}

```

## ネイティブビルドのエラー対策

[こちらのissue](https://github.com/helidon-io/helidon/issues/6260)を立てたところ、contributorの方に反応していただけました。少し`Dockerfile.native`の修正と`pom.xml`の修正が必要です。

1. `Dockerfile.native`の最初の`RUN`の`-Pnative-image -Dnative.image.skip`を削除
2. `Dockerfile.native`の実行イメージを`FROM scratch`から`FROM ghcr.io/oracle/oraclelinux:9-slim`に変更
3. `pom.exe`に`native-maven-plugin`の変更を追加↓（com.acmeの部分は自分のアプリケーションのパッケージ名にする）

```xml
<plugin>
    <groupId>org.graalvm.buildtools</groupId>
    <artifactId>native-maven-plugin</artifactId>
    <configuration>
        <buildArgs>--initialize-at-build-time=com.acme</buildArgs>
    </configuration>
</plugin>
```

これでビルドできました！

# まとめ

ということで、コードを書かずにサンプルを動かしただけですが、今時のJavaの開発を体験してみました。ネイティブイメージのビルドはまだエラーがありますが（回避は可能）、`helidon`コマンドでプロジェクト作成から開発サーバーの起動ができ、jarもビルドできました。また、Dockerイメージのビルドも、最初からDockerfileがついてくるので簡単にでき、デプロイも簡単そうです。ウェブ開発に必要なものがコンパクトにまとまっていますね。PythonでFastAPI環境を作るよりも簡単なぐらい。

現在のJavaはSpringBootと、このMicroProfileの2つの潮流に集約されてきているようです。チャンスがあればこのHelidonとかのMicroProfileを実開発に投入してみたいですね。
