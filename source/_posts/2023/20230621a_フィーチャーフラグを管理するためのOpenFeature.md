---
title: "フィーチャーフラグを管理するためのOpenFeature"
date: 2023/06/21 00:00:00
postid: a
tag:
  - リリース
  - CNCF
category:
  - DevOps
thumbnail: /images/2023/20230621a/thumbnail.png
author: 真野隼記
lede: "クラウドネイティブなフィーチャーフラグの標準とAPI、SDKを提供するOpenFeatureについてです"
---
<img src="/images/2023/20230621a/top.png" alt="" width="1200" height="600" loading="lazy">

## はじめに

TIG DXユニット真野です。

[CNCF連載](/articles/20230619a/)の2本目はクラウドネイティブなフィーチャーフラグの標準とAPI、SDKを提供するOpenFeatureについてです。

## フィーチャーフラグとは

フィーチャーフラグとはコードを変更せずに、フラグを使って機能を有効/無効化する開発/デプロイ手法のことです。一般的なユースケースとしては、特定のユーザーに対して再起動とか再デプロイをせずに、新機能を有効化したいといった場合に役立ちます。信頼度が高くなったらより段階的に広範囲に対象を広げていくと安心ですね。この使い方だけであれば、カナリアリリースを想像しますが、他にも次のようなユースケースが考えられます。

* 初期から契約している特別な顧客（あるいはプレミアムプランに契約している顧客）に向けて開発した機能を提供する
* バグが見つかったので、該当機能を無効化してアプリの振る舞いをロールバックする
* 繁忙期にシステム負荷が高まったたため、特定のオプション機能を一時的に無効化する
* 実装は完成したがリリース時期を後ろにしたい場合でもメインブランチにマージすることで、レビューコストやConflictを防ぎ開発生産性を高める

個人的には、レビューや内部テストは終わっているものの、周辺システムとの整合性を保つためマージ待ちのDraft Pull Requestが、いざリリースしたいタイミングで見ると盛大にConflictしている悲しい様子をよく見るため、開発者目線でもフィーチャーフラグ化に興味を持ちました。この点において、フィーチャーフラグはデプロイ手法だけではなく、開発手法であるとも言えることが分かります。これを拡大してアジャイル開発の次はフィーチャーフラグだ（？）といった言説も聞いたことがあります。

このフラグで動作をスイッチさせる手法は昔からあったと思いますが、界隈で有名になったのは martinfowler.com に掲載されたフィーチャーフラグの記事でしょうか。

* [FeatureToggle](https://martinfowler.com/bliki/FeatureToggle.html): 2010年公開。この時期にすでにこういう話があったんですね
* [Feature Toggles (aka Feature Flags)](https://martinfowler.com/articles/feature-toggles.html) :2017年公開
  * 和訳（感謝!!）: https://qiita.com/TsuyoshiUshio@github/items/51c6662cd45bded95389

なお、マーティンファウラーさんは、フィーチャーフラグ自体は最終手段にすべき。機能を細かく分割して段階リリースをしたり、バックエンド側を先に作りUIからの呼び出しは最後まで行わない（意訳）といったことを推奨しています。使いすぎると混乱しますし、実際フラグの管理コストや新規参画者へのキャッチアップコストはそこそこ高くなりそうなのはなんとなく想像できます。

toru-takahashi さんの[こんなフィーチャーフラグは気をつけろ！](https://blog.torut.tokyo/entry/2022/05/03/172348) にはフィーチャーフラグのあるある（？）なネタが書かれており、使わなくて済むのであればそれにこしたことがないことはより具体的に理解できます。利用については[フィーチャーフラグのベストプラクティス](https://harness.digitalstacks.net/blog/feature-flags/feature-flags-best-practices/)記事がいくつか公開されているので、一読すると注意すべき観点がわかると思います。

## フィーチャーフラグの実現方法

最もシンプルに表現すると if 分岐をコードに書きます。

```go
if featureFlag {
    // フィーチャーフラグが有効な場合に動かす実装
} else {
    // 無効時に動かす実装
}
```

featureFlagは環境変数から取ってきても、何かしらのOSSツールやSaaSサービスから取ってきても良いです。やっていることは非常にシンプルなことに大層な名前を付けている気さえしてきます。

ただ、先程のユースケースのように、特定のユーザーに応じた複数のフィーチャーフラグを管理したり、新機能のA/Bをランダムなユーザーにテストしたいと言った場合には、環境変数などでは限界があります。個人的には環境変数を変えると、AWSのECSでもLambdaでもTerraformなどのIaCが書き換わるので、もはやそれはランタイムではないもののコード変更じゃないかと思ったりもしますが気にしないことにします。フラグ値の取得元はファイル、DB、etcdなどのKVストアなど、バリエーションに富みます。

## OpenFeatureとは

OpenFeatureは、機能フラグ管理のオープンな標準です。特定のベンダー依存なしにAPIを定義したりSDKを提供します。フィーチャーフラグ界隈のエコシステムを堅牢に発展させることを目的としています。

個人的によく似ているなと思ったのは、[Go CDK（gocloud）](/articles/20191111/)でしょうか。Go CDKはAWS、Azure、GoogleCloudなど複数のクラウドベンダーが提供する、ドキュメントDBやオブジェクトストレージを共通のAPIで操作できるようにして、特定のクラウドベンダーへのロックインを回避し、開発生産性をあげたり、ハイブリッドクラウドの促進を図るものです。もっというとJDBCでDB操作が抽象化されているものに似たようなもの感じます。

[OpenFeatureのintro](https://openfeature.dev/docs/reference/intro)に載っている図がそういった構造を示していて、アプリケーションはOpenFeatureのSDK（汎化されたAPI）を呼び出すことで、その裏側のProviderが固有のバックエンドからフィーチャーフラグ値を取得する仕組みであることが分かります。Providerが例えばセルフホストかクラウドホストなどのプロダクト差異とか環境差異を吸収しているということです。

<img src="/images/2023/20230621a/of-architecture-a49b167df4037d936bd6623907d84de1.png" alt="of-architecture-a49b167df4037d936bd6623907d84de1.png" width="1200" height="401" loading="lazy">

OpenFeatureを利用するアプリケーションとしては、固有のプロダクトにロックインされないこと、でも便利なAPIは提供して欲しいといった相反することを期待しますし、仕様検討側はそういったことを加味しつつフィーチャーフラグの標準を作るとしてAPI設計を考え、各SDKを開発促進するという、CNCFのプロダクトとして少し異色なプロダクトに感じます。純粋なプロダクト開発ではないというか。

2023年6月時点でサンドボックス。リポジトリの[spec](https://github.com/open-feature/spec/releases/tag/v0.6.0)を見ると、v0.6.0が最新でした。今のところドキュメントには、TypeScript、Java、C#、Go、PHPのサンプルコードが記載されています。

他の特徴としては、Hooks（フック）という仕組みがあり、フラグ値を評価/利用する時にロギング、分散トレーシング、メトリクスの送信などを差し込むことができます。公式サイトにもOpenTelemetryフックやDatadogフックがリンクされており、おお！ となりました。

## Goで触ってみた

<img src="/images/2023/20230621a/image.png" alt="image.png" width="1200" height="458" loading="lazy">

フィーチャーフラグの値は、[GO Feature Flag](https://gofeatureflag.org/)から取ってくるProviderを利用して、OpenFeatureのGo SDKを利用してみます。名前がややこしいですが、 「Go Feature Flag」という個別のプロダクト名です。構成は次のような[Getting Started](https://gofeatureflag.org/docs/getting_started/using-openfeature)に記載された構成で動かします。

<img src="/images/2023/20230621a/concepts-d23b05d83bb936d1d2cf17b34ec1d505.jpg" alt="concepts-d23b05d83bb936d1d2cf17b34ec1d505.jpg" width="1200" height="396" loading="lazy">

動作に当たって、YAML定義を元にフィーチャーフラグの値を返す設定を入れます。
今回は、リクエストに `role` というキーの値が `admin` の場合に、`flag-only-for-admin` = `true` を返す設定とします。

```yaml flag-config.yaml
flag-only-for-admin:
  variations:
    admin: true
    other: false
  targeting:
    - query: role eq "admin"
      percentage:
        admin: 100
        other: 0
  defaultRule:
    percentage:
      admin: 0
      other: 100
```

```yaml goff-proxy.yaml
listen: 1031
pollingInterval: 1000
startWithRetrieverError: false
retriever:
  kind: file
  path: flag-config.yaml
exporter:
  kind: log
```

上記の2つのYAMLを同一階層において、go-feature-flag-relay-proxyを起動します。

```sh Docker起動
docker run \
    -p 1031:1031 \
    -v $(pwd)/flag-config.yaml:/flag-config.yaml \
    -v $(pwd)/goff-proxy.yaml:/goff-proxy.yaml \
    thomaspoignant/go-feature-flag-relay-proxy:latest
```

GoのクライアントアプリからProvider側を実行します。

```go main.go
package main

import (
	"context"
	"fmt"
	"log"

	gofeatureflag "github.com/open-feature/go-sdk-contrib/providers/go-feature-flag/pkg"
	of "github.com/open-feature/go-sdk/pkg/openfeature"
)

func main() {
	ctx := context.Background()

	// プロバイダーの初期化
	provider, err := gofeatureflag.NewProviderWithContext(ctx, gofeatureflag.ProviderOptions{
		Endpoint: "http://localhost:1031",
	})
	if err != nil {
		log.Fatalln("gofeatureflag new provider: %w", err)
	}
	of.SetProvider(provider)

	// 評価するための情報を付与
	client := of.NewClient("my-app")
	evaluationCtx := of.NewEvaluationContext(
		"1d1b9238-2591-4a47-94cf-d2bc080892f1",
		map[string]interface{}{
			"firstname": "mirai",
			"lastname":  "taro",
			"role":      "admin", // ★admin 設定
		})

    // OpenFeatureのSDK経由で、go-feature-flag-relay-proxyにフラグ値を問い合わせる
	adminFlag, _ := client.BooleanValue(ctx, "flag-only-for-admin", false, evaluationCtx)
	if adminFlag {
		fmt.Println("アドミン向け機能ON")
	} else {
		fmt.Println("アドミン向け機能OFF")
	}

}
```

上記を実行すると `アドミン向け機能ON` が出力されます。標準の機能としても、`evaluationCtx` の部分にあるように、フラグの判定情報をフィーチャーフラグ管理サービス側に渡して、評価させることができます。このサンプルでは、氏名とロール情報だけですが、IPアドレスやユーザーの契約情報、もしくはメールアドレスなどを渡すことで、特定のルールベースでフラグ値を書き換えることができます。

例えば「ある地域の顧客の 1 パーセントに絞って」とか、「最近アカウントを作成した顧客にのみに適用させたい」といったことにも対応できそうですね。OpeanFeatureとは直接関係ない「GO Feature Flag」の領域の話ですが、面白く感じます。

OpenFeatureのGo SDKは上記のBoolean値の評価以外にも、下記のようなAPIがあります。Boolean値にとどめた方が良さそうな気がしますが、OpenFeatureの仕様で文字列や数値型も許容されていることが分かります。

* StringEvaluation()
* FloatEvaluation()
* IntEvaluation()
* ObjectEvaluation()

使ってみての何かしらの付加情報込みでフィーチャーフラグを制御したいだとか、問い合わせ時にロギングなどのフックが欲しい程度の要件であれば、現段階でも十分使えそうだなと感じました。

## まとめ

OpenFeatureを使ってみた記事です。こういったベンダーロックインを回避する抽象化層は、機能制約がかかるというリスクはあるものの（フィーチャーフラグ管理サービスを使う場合、その機能をフルで利用できないということです）、そのプロダクトに依存しすぎることを防いでくれる側面もあるので、個人的には使っていきたいと感じました。

Providerの実装は現状だとインタフェースは絞られており実装の難易度はそこまで高く無さそうですので、そのうちトライできたらなと思います。

フィーチャーフラグを利用する場合に、OpenFeatureの採用も考慮に入れる材料になれば幸いです。
