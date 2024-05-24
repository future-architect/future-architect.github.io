---
title: "FutureTechNight#20 Stateの分割戦略 〜ModulesとWorkspacesを利用して〜"
date: 2022/03/31 00:00:00
postid: a
tag:
  - Terraform
  - TechNight
  - 登壇レポート
category:
  - Infrastructure
thumbnail: /images/20220331a/thumbnail.png
author: 伊藤太斉
lede: "2022/2/17に開催したFuture Tech Night #20で登壇した内容のサマリと、当日はお伝えしきれなかったことについて触れていきます。TerraformのStateは、これを扱う上で非常に重要な役割を果たします。実際のリソースと、Terraformソースコードとの差異を確認するためにも、リソースをTerraformの管理下とするためにも必要不可欠なコンポーネントになってきます。"
---
こんにちは。TIGの伊藤太斉です。
今回は2022/2/17に開催したFuture Tech Night #20で登壇した内容のサマリと、当日はお伝えしきれなかったことについて触れていきます。

## スライド
今回の登壇の際のスライドはこちらです。

<iframe class="speakerdeck-iframe" frameborder="0" src="https://speakerdeck.com/player/b4d6453f61534bffb7ce472ecf87f028" title="20220214_Future Tech Night" allowfullscreen="true" mozallowfullscreen="true" webkitallowfullscreen="true" style="border: 0px; background: padding-box padding-box rgba(0, 0, 0, 0.1); margin: 0px; padding: 0px; border-radius: 6px; box-shadow: rgba(0, 0, 0, 0.2) 0px 5px 40px; width: 560px; height: 315px;" data-ratio="1.7777777777777777"></iframe>

## 動画
今回のTech NightのYouTube動画はこちらです。

<iframe width="560" height="315" src="https://www.youtube.com/embed/fpSAwLWnfFo" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

## はじめに
TerraformのStateは、これを扱う上で非常に重要な役割を果たします。実際のリソースと、Terraformソースコードとの差異を確認するためにも、リソースをTerraformの管理下とするためにも必要不可欠なコンポーネントになってきます。
Stateの管理分掌は

- 責任の分かれ目
- 管理の分かれ目

を目指して設計、実装を進めていくことが望ましいと考えています。そのためにState管理はどうあるべきかを考えてみました。

## サマリ
### Modules
- Modulesの原則は共に使うリソース群の「まとまり」であること
- アーキテクチャを踏まえた構成でModulesを構成すること（クラウドサービスごとではない）
- Stateは**単一**になる
    - 権限分離はディレクトリごとになる
    - ディレクトリ単位でStateが生成されるため
    - ＝操作する人によってディレクトリを決定づけることができる
- サービス群（Modules単位）で設定ができる
    - Workspacesより柔軟にサービスの切り分け、増減が可能になる

### Workspaces
- Stateに名前をつけてリソースの管理を分割する機能
    - Terraformでの管理が分かれる
    - リソースの依存関係も分けられる
    - 環境面におけるリソースの差異が少ない時に向いている

### 組み合わせて使う時場合
- リソースの特性を考えて使い分ける
    - ネットワーキング系リソース
        - **Workspaces向きのリソース**
        - 環境によるリソース差異がすくない（レプリケーションで済むため）
    - コンピュート系・運用系
        - Modules向きのリソース
        - 環境差異が生まれやすい（数やスペックなど）

## 質問など
当日いただいた質問の中で改めて回答ができるものについて、こちらで触れます
> modulesの例だとLBを2回書かないといけない（service_a, service_b両方分）のが少し手間だなあと思ったのですが、AWSリソース単位ではmoduleを作成しない理由をもう少し詳しくお伺いしたいです

<img src="/images/20220331a/2022_0217_Future_Tech_Night_20.png" alt="2022_0217_Future_Tech_Night_#20" width="960" height="540" loading="lazy">

(登壇スライドより引用)

例えば、service_a、service_bで利用するLBが共にALBであった場合にはひとつのModulesとしても良いかと思いますが、LBの種類が異なるのであればTerraformとして書くパラメータもそれなりに変わるので、サービス単位で包含した方が取り扱う変数が減るため、運用としては簡単になるかと思います。
また、LBはバックエンドに何が入るかによって、ある程度扱いが変わることも理由のひとつとなります。

> ブランチ戦略について

特段、環境ごとにリリースするブランチを分けて利用は今まで深く考えずに利用していましたが、Modulesのみを利用していた時にはmainブランチ1本で利用をしていました。これは、環境ごと変数を書き込むディレクトリが異なるため、ある程度権限分離までなされるためです。
一方、Workspacesであれば、全ての環境で同一のコードを読みに行くので、

```
topic(変更) -> release(検証リリース) -> main(本番リリース)
```
とすることもできるかと考えています。

## まとめ

Terraformは誰もがベストプラクティスを探りながら書いたり運用したりしているかと思いますが、組織に合わせた権限分離をすることで、事故の軽減などができるのではないかと考えています。
