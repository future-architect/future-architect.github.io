---
title: "Cloudflare R2でTerraformのStateを管理する方法: Cloudflare Meetup Nagano Vol.2 に登壇しました"
date: 2023/10/16 00:00:00
postid: a
tag:
  - Cloudflare
  - Terraform
  - 登壇レポート
  - tfstate
category:
  - DevOps
thumbnail: /images/2023/20231016a/thumbnail.png
author: 伊藤太斉
lede: "10/14に開催されたCloudflare Meetup Naganoに登壇したので発表内容のサマリとイベントのレポートです。"
---
<img src="/images/2023/20231016a/cloudflare_nagano.png" alt="" width="660" height="371" loading="lazy">

イベントリンク： https://cfm-cts.connpass.com/event/295067/

こんにちは。TIGの伊藤です。

10/14に開催されたCloudflare Meetup Naganoに登壇したので発表内容のサマリとイベントのレポートです。

## 当日のセッション内容

当日のセッション内容は以下のスライドになります。

<iframe class="speakerdeck-iframe" frameborder="0" src="https://speakerdeck.com/player/25755a81f5c64cebad8f4f8d4e3e4fc1" title="Cloudflare Meetup Nagano Vol.2" allowfullscreen="true" style="border: 0px; background: padding-box padding-box rgba(0, 0, 0, 0.1); margin: 0px; padding: 0px; border-radius: 6px; box-shadow: rgba(0, 0, 0, 0.2) 0px 5px 40px; width: 100%; height: auto; aspect-ratio: 560 / 315;" data-ratio="1.7777777777777777"></iframe>

https://github.com/kaedemalu/cf-teraform-handson

### Cloudflare R2でTerraformのStateを管理する方法

今回の登壇では、CloudflareのR2でTerraformのStateを管理できるのか、を調べたので、これを登壇ネタとしました。

TerraformのStateは一般的にはクラウドプロバイダーが提供するストレージサービスで管理します。例えばAWSであればS3、Google CloudであればGCSのようなものです。

この時に、S3にホストさせるのであればいかのようなブロックを書いてBackendの設定を行います。

```sh
terraform {
  backend "s3" {
    bucket = "sample-tfstate" # バケット名
    key    = "state" # オブジェクトのパスを指定
    region = "us-east-1" # バケットのリージョン
  }
}
```

もし、Cloudflareの管理はCloudflareのみで行いたい思いが出てきた時は、ストレージサービスであるR2をBackendとする場合、以下のように書けるとおよそ想像できます(サポートされている前提ですが)。

```sh
terraform {
  backend "r2" {
    bucket = "sample-tfstate"
    key    = "state"
  }
}
```

ただ、R2を直接的にBackendとして指定することは現時点では対応していない状態です。が、リクエストはTerraform側に出ています。

https://github.com/hashicorp/terraform/issues/33847

そこで目をつけたのが、[S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/)に記載されている、R2とS3の互換性です。R2ではS3の一定のAPIを担保しており、`aws`コマンドでR2を操作できます。そのため同様にTerraformでも、`backend`ブロックでS3を宣言していても実態はR2を見せることができるのではないかと思って今回のネタにしました。

#### R2でState管理を実際に行う

R2のバケットや、クレデンシャルの作成については登壇資料でもある程度触れているので、記事では実際に遭遇したエラーの解消過程を書いていきます。

S3に互換性のあるAPIを利用するということで、TerraformからはS3を使っているように見せることが必要になります。そのため、利用するBackendタイプは`s3`を使います。

まずは単純にR2バケット名を指定して`terraform init`コマンドを実行しました。

```sh backend.tf
terraform {
  backend "s3" {
    bucket = "kaedemalu-tfstate"
    key    = "default.state"
    region = "us-east-1"
  }
}
```

```bash
# エラー1
terraform init

Initializing the backend...
╷
│ Error: error configuring S3 Backend: error validating provider credentials: error calling sts:GetCallerIdentity: InvalidClientTokenId: The security token included in the request is invalid.
│       status code: 403, request id: 98614ab4-7f7d-46c6-a5fb-1a8aae073866
│ 
│ 
╵
```

`error validating provider credentials`ということでクレデンシャルのバリデーションに失敗しているようです。これはまず回避するために、`skip_credentials_validation = true`を追加して再度コマンド実行しました。

```sh backend.tf
terraform {
  backend "s3" {
    bucket                      = "kaedemalu-tfstate"
    key                         = "default.state"
    region                      = "us-east-1"
    skip_credentials_validation = true # 追加
  }
}
```

```bash
# エラー2
terraform init

Initializing the backend...

Successfully configured the backend "s3"! Terraform will automatically
use this backend unless the backend configuration changes.
Error refreshing state: InvalidAccessKeyId: The AWS Access Key Id you provided does not exist in our records.
        status code: 403, request id: W0GM5Q8918T7P5AT, host id: 55kKe3sn45n/RxCHZA5V2fR7lg0TE3OH0CGZlN6gi2bDzQfey8/oQALJWbRo9h1czaK7+f9t4i0=
```

S3としてTerraformに対して見せることはできているようですが、`The AWS Access Key Id you provided does not exist in our records.`とエラーが返ってきて、AWSで発行するアクセスキーIDではないと怒られました。Cloudflareから発行するアクセスキーIDとAWSのそれとは異なるので、このエラーに対しても納得できます。

このエラーをよく考えてみると、上記の書き方ではS3エンドポイントのBackendを使うので、デフォルトでは`https://s3.us-east-1.amazonaws.com`を見に行っていることが考えられました。R2では`https://<CLOUDFLARE_ACCOUNT_ID>.r2.cloudflarestorage.com`をエンドポイントとしているので、`endpoint`パラメータでエンドポイントを上書きしました。。この状態で`terraform init`コマンドを実行することで、無事、R2をS3と見せかけた状態で成功しました。

```sh backend.tf
terraform {
  backend "s3" {
    bucket                      = "kaedemalu-tfstate"
    key                         = "default.state"
    region                      = "us-east-1"
    endpoint                    = "https://<CLOUDFLARE_ACCOUNT_ID>.r2.cloudflarestorage.com" # 追加
    skip_credentials_validation = true
  }
}
```

これで、無事R2でState管理をできるようになり、リソース作成を行うと、実際にStateファイル(`default.state`)が配置されたり、更新されることがわかりました。そのため、現在のS3互換のAPIサポート状況でも問題なく利用できることがわかりました。

## ほかの登壇内容

### Cloudflare 亀田さんのセッション

当日のハンズオン資料：[Cloudflare AI Gateway を試してみた](https://zenn.dev/kameoncloud/articles/ee68d54bcadf90)

今回はイベント当時ベータ版であるAI Gatewayを経由して、Cloudflare WorkersからOpenAI(Chat GPT)にリクエストを実行するハンズオンでした。今回はOpenAIでしたが、プロキシするサービスはこれ以外にも複数選択することが可能で、これはマルチクラウドで使うことが考えられるCloudflareならではと感じたサービスでした。

ハンズオンを通して、Workersの手軽さはもちろん、デプロイに利用するWranglerも含めてしっかり整っていることを感じました。また、ハンズオンの時間が少々余ったので、ほかのハンズオン資料として、[Cloudflare Workers AI のハンズオン手順](https://zenn.dev/kameoncloud/articles/707b3b623bdb87)も試してみました。これはCloudflareのエッジポイントに配置されているGPUをWorkersで利用し、推論などを行うハンズオンでした。そのため、

- ほかのサービスを利用する場合：AI Gateway
- Cloudflare上で完結させる場合：Workers AI

と感じました。Clouflare内で構築済みのモデルを利用して私自身もいくつか質問を投げてみましたが、現状は英語での質問がそれなりの精度になる一方日本語については文章の組み立てなどに課題がありそうでした。

### Cloudflare Pages入門してみた

<iframe class="speakerdeck-iframe" frameborder="0" src="https://speakerdeck.com/player/b7619952be484ddc9be5780247ab0f63" title="Cloudflare Pages に入門してみた / 2023-10-14 Cloudflare Meetup Nagano Vol.2" allowfullscreen="true" style="border: 0px; background: padding-box padding-box rgba(0, 0, 0, 0.1); margin: 0px; padding: 0px; border-radius: 6px; box-shadow: rgba(0, 0, 0, 0.2) 0px 5px 40px; width: 100%; height: auto; aspect-ratio: 560 / 315;" data-ratio="1.7777777777777777"></iframe>

Cloudflare Pagesの話ではありましたが、モダンフロントエンド、Webフレームワークの話として参考になりました。私自身、Next.jsを最近触っていることもあり、機能としてフルに生かすために、やほかのフレームワークとの比較がなんとなくイメージつくLTでした。

### Cloudflare WorkersでOpenAIのLINE Chatbotを作ってみた

<iframe class="speakerdeck-iframe" frameborder="0" src="https://speakerdeck.com/player/d263bb47e8cf4438a958135a550fe97e" title="Cloudflare Workers で OpenAI の LINE Chatbotを作ってみた" allowfullscreen="true" style="border: 0px; background: padding-box padding-box rgba(0, 0, 0, 0.1); margin: 0px; padding: 0px; border-radius: 6px; box-shadow: rgba(0, 0, 0, 0.2) 0px 5px 40px; width: 100%; height: auto; aspect-ratio: 560 / 315;" data-ratio="1.7777777777777777"></iframe>

LTのネタとして昨今話題になっているOpenAIについて取り上げていましたが、作成の動機がお子さんにAIに触れる機会を作りたい、という親心に心を打たれました。肝心のLINE Chatbotについても半日くらいで作れたようで、開発体験の良さなどのメリット、いまいちなポイントなども知れました。フレームワークについても[hono](https://hono.dev/)を利用されていたので、以下のリポジトリ試してみようと思います。

https://github.com/koda-masaru/chat-bot

### Cloudflare Zero Trustを設定して使ってもらってみた

こちらは、前回のCloudflare Meetup Nagano Vol.1に参加して、Cloudflareに興味を持ったことから実際に仕事でZero Trustを導入した話でした。

仕事で開発されているシステムのデモ環境への接続のスピード、セキュリティの担保をするためにZero Trustを導入して、導入前でもできていたポイントはもちろん、課題とされていた接続スピードについても解消されているということで、Cloudflareのサービス群の導入に対するフットワークの軽さ・導入コストの低さを改めて感じました。

## まとめ

前回に引き続きVol.2も参加し、かつ今回は登壇の機会をいただけたので、調べても出てこなかったことをネタにして形にできました。
また、イベントの開催地が私の地元である長野であるということもあり、地元のコミュニティに関われたことがとても嬉しかったので、今後もなんらかの形で関われればと考えています。

## 余談）地方勉強会参加のススメ

今回、長野のイベントに参加するきっかけは帰省しながら参加できることにつきますが、これに限らず地方で開催される勉強会も改めて足をのばすと良いなと思いました。普段足を伸ばすきっかけがない土地でも、技術やイベントに誘われて参加しつつ、近隣の観光やその土地の料理を味わえるのも地方勉強会ならではの良さだと考えています。今回は懇親会で長野の日本酒をたくさん楽しめました。

<img src="/images/2023/20231016a/IMG_3553.jpg" alt="" width="1200" height="1093" loading="lazy">

## 参考

- 技術ブログのほかのClouflare記事
  - [CDN 入門とエッジでのアプリケーション実行](https://future-architect.github.io/articles/20230427a/)
  - [cf-terraformingで入門するCloudflare](https://future-architect.github.io/articles/20230502a/)
- イベント当日のハッシュタグ [#CloudflareUG_mmj](https://twitter.com/hashtag/CloudflareUG_mmj)
- [Togetter](https://togetter.com/li/2241595)
