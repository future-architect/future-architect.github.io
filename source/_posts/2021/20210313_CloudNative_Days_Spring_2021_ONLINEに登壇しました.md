---
title: "CloudNative Days Spring 2021 ONLINEに登壇しました"
date: 2021/03/13 00:00:00
postid: ""
tag:
  - 登壇レポート
  - OpenPolicyAgent
  - CNCF
  - Policy-as-Code
  - カンファレンス
category:
  - Infrastructure
thumbnail: /images/20210313/thumbnail.png
author: 伊藤太斉
lede: "こんにちは。TIGの伊藤太斉です。今回は先日開催されました、CloudNative Days Spring 2021 ONLINEに登壇しましたので、その内容について書いていきます。はじめにイベントの概要について簡単に説明します。"
---
こんにちは。TIGの伊藤太斉です。
今回は先日開催されました、[CloudNative Days Spring 2021 ONLINE](https://event.cloudnativedays.jp/cndo2021)に登壇しましたので、その内容について書いていきます。

<img src="/images/20210313/CNDO2021@2x.png" loading="lazy">

## CloudNative Daysについて
はじめにイベントの概要について簡単に説明します。
[前回の公式](https://event.cloudnativedays.jp/cndt2020)から引用すると、
> CloudNative Days はコミュニティ、企業、技術者が一堂に会し、クラウドネイティブムーブメントを牽引することを目的としたテックカンファレンスです。
最新の活用事例や先進的なアーキテクチャを学べるのはもちろん、ナレッジの共有やディスカッションの場を通じて登壇者と参加者、参加者同士の繋がりを深め、初心者から熟練者までが共に成長できる機会を提供します。

とあるように、モダンアーキテクチャを学ぶ場であったり、これからインフラのモダナイゼーションを行う方にとってディスカッションの場として提供するテックカンファレンスです。
前回は登壇者は自宅、配信会場どちらかを選んで登壇しましたが、今回は全員事前に動画を提出し、配信会場にはオペレーションを行う一部の人のみとしています。またプラットフォームも独自で開発しているものであり、オンラインカンファレンスとしては初の試みの多い内容になっています。
今回は、前回に引き続き私は運営として参加しております。

## 登壇内容について
登壇資料はこちらになります。

<script async class="speakerdeck-embed" data-id="f9d34e658df049bd992ba11c212a7a5f" data-ratio="1.77777777777778" src="//speakerdeck.com/assets/embed.js"></script>

今回は、CNCFのプロジェクトの中から[Open Policy Agent](https://www.openpolicyagent.org/)（以下、OPA）について話しました。OPAは、CNCFのプロジェクトの中で一番最近Graduatedプロジェクトになりました。

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">[NEWS] Cloud Native Computing Foundation Announces Open Policy Agent Graduation 🤗<a href="https://t.co/36yiIhCYvc">https://t.co/36yiIhCYvc</a> <a href="https://t.co/EquYZUqBbu">pic.twitter.com/EquYZUqBbu</a></p>&mdash; CNCF (@CloudNativeFdn) <a href="https://twitter.com/CloudNativeFdn/status/1357373603633848322?ref_src=twsrc%5Etfw">February 4, 2021</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

そんな勢いのあるOPAを、今回はTerraformのコード規約として使えないかということで検証という意味でも使ってみた話です。

### Open Policy Agentについて
簡単にOPAについて説明します。
OPAはPolicy as Code（PaC）を実現するツールです。CNCFでホストされているのでKubernetesにしか利用できない、というわけではなく、JSON、YAMLなど様々なデータを扱ってポリシーで管理することができます。
記述する際にはRegoという独自言語で実装します。サンプルなどは後述します。

### Infrastructure as Codeの横展開で起こりうる話
Infrastructure as Code（以下、IaC）を実践することで以下のメリットがあるかと思います。

- パラメーターシートとして利用できる
- Gitなどで管理されることで常に最新の状態が分かる
- 可搬性があるので、プロジェクトを跨いで同じコードを利用できる
- HCLも含めて比較的読みやすい言語で書かれているため入門しやすい

特に可搬性については大きなメリットであり、新しく社内でプロジェクトが立ち上がったときにはコードの共有を行うことで、開発の高速化も望めます。

<img src="/images/20210313/CNDO_1.png" loading="lazy">

このようにメリットの大きいIaCですが、浸透が進むにあたり、デメリットも生じます。

- コードの流派が異なる
- コードの規約が異なる

といったように上記の２つは少ないようにみえて、エンジニアの負荷を大きくあげる原因になりかねないデメリットです。将来的に普及が進んだ後にこれらを統制することはかなり大変になるのでないかと懸念されました。そのため、社内で共通の言語としての規約、が必要だと感じました。そのためのPaCのツールとしてOPAを利用することを検討しました。

### OPAを実際に利用してみる
今回はTerraformのリソース名を`-`区切りではなく`_`区切りで書くことを強制したいと思います。
利用するTerraformとRegoは以下になります。

```terraform
provider "aws" {
    region = "us-west-1"
}
resource "aws_instance" "web_instance" {
  instance_type = "t2.micro"
  ami = "ami-09b4b74c"
}

resource "aws_instance" "mail-instance" {
  instance_type = "t2.micro"
  ami = "ami-09b4b74c"
}
```

```go
package test

lint[msg] {
    resource := input.resource_changes[index]
    resource.type == "aws_instance"

    result := count(split(resource.name, "-")) == 1
    msg := sprintf("Test result of %v.%v is %v", [resource.type, resource.name, result])
}
```
Terraformの中身は単純なインスタンスを2台作成するもの、Regoの中身は、`-`が含まれる場合にはsplitして、その総計を数えるようにしています。総計が1（分かれていない状態）であればtrue、総計が2以上であればfalseを返します。
ここからは実際にコマンドを実行しながら確認します。

```sh
# Plan結果をバイナリに吐き出す
$ tf plan -out tfplan.binary
# バイナリをJSONに吐き出して、jqコマンドで整形する
$ tf show -json tfplan.binary | jq . > tfplan.json
# Regoを使ってJSONを評価する
$ opa eval --format json --data test.rego --input tfplan.json "data.test.lint"
```
最後のコマンドの実行結果は以下になります。

```json
{
  "result": [
    {
      "expressions": [
        {
          "value": [
            "Test result of aws_instance.mail-instance is false", # ハイフン区切りはfalseになる
            "Test result of aws_instance.web_instance is true" # アンダースコア区切りはtrueになる
          ],
          "text": "data.test.lint",
          "location": {
            "row": 1,
            "col": 1
          }
        }
      ]
    }
  ]
}
```

想定通り、mailインスタンスについてはfalsem、webインスタンスについてはtrueになりました。

### 実際に触ってみた感触とこれから
今回、OPAを触ってみて、得意なところ、できないところがなんとなくですが見えてきました。

#### 出来ること
JSONで出力できる範囲ならかなり強力に押さえ込むことができることを感じました。例えば、

- インスタンスに対しては特定のタグを必須とする
- リージョンは東京リージョンのみに制限する
- インスタンスタイプは`t3.medium`のみに制限する

などの制限は可能なので、プロジェクトごと制約をかけたい場合に有用です。

#### 出来ないこと
一方出来ないことも見えてきました。

- Terraformのソースコードチェック
    - countの配置箇所
    - Linterのような動かし方

結局JSONなどのデータを扱うため、元のTerraformのソースコード自体をみることはありません。

## まとめ
OPAはリソースを使用する範囲を決めるという文脈ではかなり強力に制限してくれることを感じました。一方、Terraformそのままのコードを制限するためにはLinterなどの別のツールが必要だと思いました。単一のツールではなくて、複合的に利用していくことで、出来上がるリソース、記述するコードの両方を整えられると考えました。
社内のIaCの平和を守るために、まだ考え始めた段階ですが、規約は作って浸透させるまでが仕事だと思うので、まだまだ先は長いです。

## オススメの連載です

* [CNCF連載始めます | フューチャー技術ブログ](/articles/20200928/)
