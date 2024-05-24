---
title: "Future Tech Night(第6弾：GCP x インフラ構築編)を開催しました"
date: 2021/03/06 00:00:00
postid: ""
tag:
  - GCP
  - 登壇レポート
  - TechNight
category:
  - Infrastructure
thumbnail: /images/20210306/thumbnail.png
author: 村田靖拓
lede: "こんにちは、TIGの西田、村田です。先日2021.01.29にオンラインにてFuture Tech Nightという社外勉強会を開催しました。第6弾はGCP×インフラというテーマで事例を紹介しました。1. [メディア業界変革編]2. [MaaS ビジネス編]3. [船舶IoT Platform編]"
---

# はじめに
こんにちは、TIGの西田、村田です。先日2021.01.29にオンラインにてFuture Tech Nightという社外勉強会を開催しました。第6弾はGCP×インフラというテーマで事例を紹介しました。

1. [メディア業界変革編](https://future.connpass.com/event/177093/)
2. [MaaS ビジネス編](https://future.connpass.com/event/179387/)
3. [船舶IoT Platform編](https://future.connpass.com/event/185051/)
4. [Go x AWS スマート工場編](https://future.connpass.com/event/188742/)
5. [AWS＆DataPlatform MaaSビジネス編](https://future.connpass.com/event/195568/)
6. [GCP x インフラ構築編](https://future.connpass.com/event/201478/) **←今回はここです**

# 概要

<img src="/images/20210306/hero-cloud-infrastructure.png" loading="lazy">

> https://cloud.google.com/training/cloud-infrastructure より


勉強会は以下の2部構成で開催しました。

1. 目指せ生産性世界一へ！超スケールへの挑戦！（TIG西田）
2. しくじり先生 絶対に油断しちゃいけないマネージドサービス（TIG村田）

続いて各パートの振り返りです。

## ①目指せ生産性世界一へ！超スケールへの挑戦！

[西田](/authors/%E8%A5%BF%E7%94%B0%E5%A5%BD%E5%AD%9D/)からは、GCP のエンプラ利用、という体で発表しました。GCP というとML/データ分析などの印象が強く、その文脈でのGCP活用事例はよく目にしますが、エンプラ領域での活用は少ないんじゃないかと思っています。

まずはエンプラ領域で求められる要件を説明しました。システムの数が膨大なので、（セキュリティ監査などの対応も相まって）管理する方の視点が強く出てきます。

<img src="/images/20210306/2021-03-10_103811.png" style="border:solid 1px #000000" loading="lazy">


上記に対して設計例をベースにお話し、まとめとしてGCPできちんと構築が可能であるということを説明しました。

<img src="/images/20210306/2021-03-10_103053.png" style="border:solid 1px #000000" loading="lazy">


前半のエンプラ領域の課題設定がどこまで聞いてくださった方に伝わったのか心配ではありましたが、アンケート的には満足頂けた方が多く、とても嬉しかったです。聴いてくださった方、本当にありがとうございました:blush:

他にも GCP に関して、[ネットワークにピンポイントで深堀りしている記事](/articles/20200813/)や、[資格関連の記事](/articles/20200902/)も掲載しておりますので、よろしければ閲覧頂けると幸いです。

## ②しくじり先生 絶対に油断しちゃいけないマネージドサービス

このパートは[村田](/authors/%E6%9D%91%E7%94%B0%E9%9D%96%E6%8B%93/)が担当しました。

タイトルを若干盛っているのは否めないですが(笑)、皆さんもお世話になっているマネージドサービスをネタに、私のしくじり体験を紹介しました。

<img src="/images/20210306/image.png" style="border:solid 1px #000000" loading="lazy">


GKEのPrivateクラスタ作成時にはVPC Peeringが自動的に作成されるんですが、そのPeeringはGCPコンソール上でユーザが編集・削除できてしまうので気をつけなければならない、というお話でした。


<img src="/images/20210306/image_2.png" style="border:solid 1px #000000" loading="lazy">


事の経緯は[Qiita：あなたの大切なGKEクラスタを崩壊させてしまう前に](https://qiita.com/famipapamart/items/1a207f90d7dd9ec85d5d)にもまとめてあります。詳細興味湧いた方はぜひ覗いてみてください。

# まとめ
ご参加いただいた方々、ありがとうございました！

フューチャーでは引き続きFuture Tech Nightを中心に[様々なイベントを開催](https://future.connpass.com/)しております。今後も皆様のご参加をお待ちしております。

connpassのフューチャーグループイベントのメンバー登録やTwitter(@future_recruit_)のフォローもお忘れなく📝
