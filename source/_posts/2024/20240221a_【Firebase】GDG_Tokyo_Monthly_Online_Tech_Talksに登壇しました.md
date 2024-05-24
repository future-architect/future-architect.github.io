---
title: "【Firebase】GDG Tokyo Monthly Online Tech Talksに登壇しました"
date: 2024/02/21 00:00:00
postid: a
tag:
  - 登壇レポート
  - Firebase
  - Flutter
  - GDG
  - GCP
category:
  - Infrastructure
thumbnail: /images/20240221a/thumbnail.png
author: 山本竜玄
lede: "2024/2/1、GDG Tokyo主催の「【Firebase】GDG Tokyo Monthly Online Tech Talks」に「Flutter×Firebaseサービス達で高速でモバイルアプリを開発した話」というタイトルで登壇しました"
---
<img src="/images/20240221a/image.png" alt="image.png" width="660" height="270" loading="lazy">

# はじめに
こんにちは。最近スギ花粉耐性がないことを実感しつつある山本です。

2024/2/1、GDG Tokyo主催の「[【Firebase】GDG Tokyo Monthly Online Tech Talks](https://gdg-tokyo.connpass.com/event/306983/)」に「Flutter×Firebaseサービス達で高速でモバイルアプリを開発した話」というタイトルで登壇してきたので、その事後レポートです。

登壇資料：

<script defer class="speakerdeck-embed" data-id="d4e715deb4044482a0aa0f0d3a5a492b" data-ratio="1.7772511848341233" src="//speakerdeck.com/assets/embed.js"></script>

## GDG Tokyo Monthly Online Tech Talksとは？

> Google Developers Group (GDG) Tokyo は主にGoogleのテクノロジーに興味のある人たちで情報を共有しあう集いです

> GDG Tokyoが毎月開催する「GDG Tokyo Monthly Online Tech Talks」は、Googleの技術に関心を持つ人々が集うオンラインMeetupです。このイベントは、Android、Google Cloud、Web、Firebase、Machine Learning（ML）、Flutter、Goなど、多様なGoogleの技術に焦点を当てています。参加者は、技術情報をキャッチアップし、エンジニア同士のコミュニケーションと交流の場としてご活用いただけます。

(※GDG Tokyoの[connpassページ](https://gdg-tokyo.connpass.com/)より引用)

---

「GDG Tokyo」および「GDG Tokyo Monthly Online Tech Talks」についてはGDG Tokyoのグループの説明として上記が記載されています。

今回のイベントのテーマは「Firebase」に関わることで、15分枠 or 5分枠の登壇枠で開催されていました。

## 登壇
最近お仕事でFirebaseに携わっていたこともあり、社内の人におすすめされたので登壇を申し込んでみました。(会社アカウントとしては初の登壇です...！)

登壇内容としては、新規事業プロジェクト周りでFlutterとFirebaseを活用していたのでそのユースケースの紹介をしてみました。

以下内容を一部抜粋して紹介していきます。

## アーキテクチャ紹介

今回紹介したユースケースとしてはモバイルアプリ側はFlutter、バックエンドサービス側をFirebaseのサービスを活用したものです。

<img src="/images/20240221a/image_2.png" alt="image.png" width="962" height="540" loading="lazy">

どちらもGoogle製ということもあり、親和性がある&ドキュメントが豊富ということでこのアーキテクチャが選定されています。

<img src="/images/20240221a/image_3.png" alt="image.png" width="961" height="543" loading="lazy">

使用したサービスを一覧で並べてみると、Firebaseを主としたかなりモダンな構成と言えるのではないでしょうか？
自分は開発チームにあとから参画したのですが、なかなか良い経験となっています。

## ログ&アラートについて

<img src="/images/20240221a/image_4.png" alt="image.png" width="963" height="536" loading="lazy">

Firebaseでログ・アラート周りに使用できるサービスとしては以下の2つがあります。

- Firebase Crashlytics
- Google Analytics for Firebase

構成としてはいろいろなものが考えられますが、今回はCrashlyticsについては主にクラッシュor致命的なエラーを通知するように、Google Analyticsにはユーザーログを出したりBigQueryに連携したりしてユーザーの操作の追跡や広告効果の測定といったことを行っていました。

※BigQueryへの連携については松井さんが以下記事で解説してます。

[Firebaseで取得したログをBigQueryに連携してユーザー操作をトラッキングする](https://future-architect.github.io/articles/20210316/)

## Firebase Remote Configについて
<img src="/images/20240221a/image_5.png" alt="image.png" width="964" height="538" loading="lazy">

その他に活用していてユニークだったサービスとしては、Remote Configがあります。

https://firebase.google.com/docs/remote-config?hl=ja

詳しくは上記の公式ページを見ていただきたいですが、Remote Config Serverでパラメータ値などを管理することで、アプリストアへのリリースすることなくユーザーアプリの画面切り替えや強制アップデートなども行えます。

まだ導入できていませんが、A/B testingなども行うことができるようなので将来的には触ってみたいですね。

## まとめ
今回はGDG Tokyoにて、最近触ったFirebaseサービスとFlutterの活用事例について登壇してきました！
会社アカウントで登壇することは初めてだったのですが、登壇になれた方やチームメンバーに手厚くフォロー頂き楽しく発表してくることができました。

今後もどんどん登壇やアウトプットできるようにがんばります。
※スギ花粉とも頑張って生きていこうと思います。

## 参考文献
- https://firebase.google.com/docs/remote-config?hl=ja
