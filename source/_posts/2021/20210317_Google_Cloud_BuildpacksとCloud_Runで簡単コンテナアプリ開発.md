---
title: "Google Cloud BuildpacksとCloud Runで簡単コンテナアプリ開発"
date: 2021/03/17 00:00:00
postid: ""
tag:
  - GCP
  - Buildpacks
  - CloudRun
  - Docker
  - コンテナデプロイ
category:
  - Programming
thumbnail: /images/20210317/thumbnail.png
author: 伊藤太斉
lede: "みなさん、コンテナを利用してアプリケーション開発していますか？最近は新規開発になると大体アーキテクチャを検討する段階で「アプリケーションをコンテナ化するか」と話題になるのではないでしょうか？単純にコンテナをデプロイして利用するだけならまだしも、Kubernetesをベースとしてアプリケーションを動かすとなると..."
---
こんにちは。TIGの[伊藤太斉](https://twitter.com/kaedemalu)です。
[GCP連載2021](/articles/20210307)第7弾です。

<img src="/images/20210317/GCP_Containers_Kubernetes.png" loading="lazy">

> https://cloud.google.com/blog/ja/products/containers-kubernetes/google-cloud-now-supports-buildpacks より

## はじめに

みなさん、コンテナを利用してアプリケーション開発していますか？最近は新規開発するとなったら大体アーキテクチャを検討する段階で「アプリケーションをコンテナ化するか」と話題になっているのではないでしょうか？単純にコンテナをデプロイして利用するだけならまだしも、Kubernetesをベースとしてアプリケーションを動かすとなると、

- Kubernetesへの理解が追いつかない
- 運用まで乗せることが大変
- そもそもDockerfile書くのもしんどい
- etc...

といった感じで採用までに立ちはだかる壁は大きく分厚いものかと思います。

また、既存のアプリをできるだけコストを抑えつつコンテナ化したい、なんていう声もありますよね？今はVMで稼働させているけど、とりあえずモダンなことしてみたい、などと言われることもあります。そんな方々への福音になるのがCloud Native Buildpacks（CN Buildpacks）です。

今回は、さらにGoogleでホストしているGoogle Cloud Buildpacks（GC Buildpacks）を利用しながらCloud Runへのデプロイを行って、簡単にアプリのコンテナ化をしていこうと思います。

CN Buildpacksについて実際に検証を行っている記事もありますので、こちらもご覧ください。

* [Buildpacksのビルダーをスクラッチから作ってみる | フューチャー技術ブログ](/articles/20201002/)

## 環境について
- Dockerがインストールされていること
- CN Buildpacksがインストールされていること
    - インストール方法は[こちら](https://buildpacks.io/docs/tools/pack/)を参照
- Google Cloud SDKをインストールして、設定済みであること
    - 本記事執筆時点では `331.0.0`を利用しています

## Google Cloud Buildpacksについて

冒頭でも触れていますが、今回、CNCFがホストしているCN BuildpacksとGoogleでホストしているGC Buildpacksがあります。GC BuildpacksはV3をベースとしています。今現在はCloud FunctionsやApp Engineの裏側のビルドに用いられるようになっている、GCPの中でサービスではないものの重要な部分を担っているものの一つです。

ベースのイメージにはUbuntu 18.04が採用されており、定期的にパッチを当てていたり脆弱性に対しても積極的にフォローしています。

Buildpacksにはアプリケーションの言語を検知する機能を有しており、言語ごと合わせてコンテナ化されていきます。現在GC Buildpacksでサポートしている言語は、

- Go
- Java
- Node.js
- Python
- .NET

が利用できます。Cloud Run自体はRubyアプリなども乗せることはできますが、ここはGC Buildpacksの今後の発展に期待ですね。

## Cloud Native Buildpacksを使ってみる
ここからは[Google Cloud公式のチュートリアル](https://github.com/GoogleCloudPlatform/buildpack-samples)を使いながら実際にCloud Runを利用するところまで実行してみます。今回はnodeのアプリケーションを利用します。

```shell
$ git clone https://github.com/GoogleCloudPlatform/buildpack-samples.git
$ cd buildpack-samples/sample-node
```
Cloneまでできたらまずはローカルで動かしましょう。

```shell
$ npm install
$ npm start
```
http://localhost:3000 にアクセスして`hello, world`が表示されることを確認しましょう。まずはコンテナになる前に動くことがわかったので次はBuildpacksを使ってコンテナ化して動かしましょう。

```shell
$ pack build --builder=gcr.io/buildpacks/builder node
$ docker run -it -ePORT=8080 -p8080:8080 node
```
こちらでも同じように`hello, world`が表示されたかと思います。コンテナ化しても同じ動きを確認したので、次は実際にCloud Runを使って確認してみましょう。
Cloud Runにデプロイする時はContainer Registryからデプロイを行いますが、ローカル環境からのデプロイ方法として2種類あります。

1. Cloud BuildでコンテナをビルドしてContainer Registryへ保存する
2. ローカルでビルドしてContainer Registryへpushする。

<img src="/images/20210317/builcpack.png" loading="lazy">

１の方がローカルを汚さずに済んだり、ローカルPCの能力に依存せずにビルドできるので、今回は前者で進めます。

```shell
$ gcloud alpha builds submit --pack image=gcr.io/[project-id]/node
```

この１行で自動的にビルドから保存まで実行してくれます。この時、引数に`--pack`をつけることでBuildpacksを使うことを指定しています。ここまでくればあとはデプロイコマンドを１行実行するだけです。

### Cloud Runへのデプロイを行う
ここでCloud Runにデプロイを行います。とはいえ、コマンド1行で実行完了するので、あっという間です。

```shell
$ gcloud run deploy --image=gcr.io/[project-id]/node --platform managed
```

このコマンドを実行すると、

- サービス名
- リージョン
- 認証されていないものを許可するか

と選択肢に出てくるので各々お好みのものを選択しましょう。
これでデプロイが終わればコンソールからCloud Runの画面に遷移して、URLをクリックすると、ローカルで見ていた画面と同じく`hello, world`が出力されているかと思います。
これで、ローカル、コンテナアプリ、Cloud Runの３つの状態で同じアプリを利用できました。

<img src="/images/20210317/image.png" loading="lazy">


## まとめ

Cloud Runが発表された2019年のGoogle Cloud Nextはかなり盛り上がったことを今でも覚えていて、その時はなんとかして知ろう、早く使おう、みたいな気持ちがあったことを思い出しました。それから2年が経とうとしていますが、IaaS畑が中心だった私はコンテナをガッツリ触ることなくここまで来ました。

クラウドリフト＆シフトという言葉がよく使われるようになってきて、今後もその流れは続くと思います。そのときに、ただオンプレミス環境からIaaSレベルであげるのではなく、コンテナ化するという選択肢が取れるだけで、アプリケーションのリフトする選択肢が大きく増えるのではないでしょうか？

基本的にどんなアプリでもコンテナにしてくれるBuildpacks、そして簡単にコンテナを実行してくれるCloud Runから、「**考えるな、感じろ！！**」な精神を垣間見た気がしました。使って楽しかったプロダクトたちなのでもっと広めて行こうと思います。

明日は、関さんの[GKE Autopilotを触ってみた](/articles/20210318/)です。何がくるかお楽しみに！！
