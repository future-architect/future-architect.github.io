---
title: "Future Tech Night #14「生体認証・デバイス認証を活用するパスワードレスな認証規格「WebAuthn」を体験！」"
date: 2021/08/11 00:00:01
postid: b
tag:
  - Auth0
  - WebAuthn
  - TechNight
  - 登壇レポート
category:
  - 認証認可
thumbnail: /images/20210811b/thumbnail.jpg
author: 市川浩暉
lede: "2021年7月21日にFuture Tech Night #14～認証認可（IDaaS）勉強会～を開催し、「生体認証・デバイス認証を活用するパスワードレスな認証規格「WebAuthn」を体験！」というテーマで登壇させていただきました。"
---
<img src="/images/20210811b/key-3348307_640.jpg" alt="" title="MasterTuxによるPixabayからの画像" width="640" height="360" loading="">

# はじめに

こんにちは、TIGの市川浩暉です。

2021年7月21日に[Future Tech Night #14～認証認可（IDaaS）勉強会～](https://future.connpass.com/event/218520/) を開催し、「生体認証・デバイス認証を活用するパスワードレスな認証規格「WebAuthn」を体験！」というテーマで登壇させていただきました。

なお、登壇者の資料は [こちら](https://future.connpass.com/event/218520/presentation/) に公開済みですので、興味があればご参照ください。

一緒にイベントに登壇した山田さんのレポートはも公開されています。

* [IDaaS(Auth0) vs OSS（Keycloak）vs Managed(Amazon Cognito)で使い勝手を確認](/articles/20210812b/)

参加申し込み数はこれまでのFuture Tech Night史上最多となる190名の申し込みをいただき、大盛況での開催となりました。

# 発表内容

<script async class="speakerdeck-embed" data-id="29f23e7fea7f428c95401c17f52005f6" data-ratio="1.77777777777778" src="//speakerdeck.com/assets/embed.js"></script>

当日の発表では、以下のアジェンダに沿って発表を実施しました。

* 自己紹介
* WebAuthnの概要説明
  * 前置き
  * これまでの認証方式
  * FIDO（Fast IDentity Online）
  * 登録、認証フロー
  * WebAuthnとは
  * 2つの認証方式
  * WebAuthn対応ブラウザ
  * WebAuthnを利用するメリット・デメリット
* Auth0を用いたWebAuthnの構築
* まとめ

# 発表の概要

まず、WebAuthnが生まれた背景を理解しやすいよう、認証方式の変遷を説明しました。

その中で、パスワード認証方式と2要素認証の課題を解決するために生まれたFIDOという考え方、そしてFIDOをWebでも使用できるようにしたFIDO2（WebAuthn, CTAP）が生まれ、WebAuthnの登録と認証のフローについて説明しました。

WebAuthnの概要を理解した後に、最近Auth0がリリースした機能を用いて実際に生体認証によるパスワードレス機能、そして実装してみた感想を発表しました。

# Q&A

## Webサーバーに公開鍵はどのタイミングで登録されるのでしょうか？

登録されるタイミングはWebサーバ側で送られてきたチャレンジキーの検証に成功したタイミングです。
スライドの[P.21](https://speakerdeck.com/hichikawa1126/future-tech-night-14?slide=21)にあるとおり、⑥にて生成した公開鍵を⑦でWebサーバ側に送信し、⑧での検証成功後に公開鍵とユーザの紐付けを行って登録します。

## 実際の業務でWebAuthenを用いたAuth0での認証を使用した事例はありますか？　またもし利用するとしたらどのような事例でしょうか？

フューチャーではAuth0をIDaaSとして採用し、実際に本番環境にて運用しているケースは多いのですが、今回ご紹介した機能はリリースされたばかりということもあり、実際のプロジェクトでの導入までは至っておりません。

IDaaSとしてAuth0を採用する場合、今回ご説明したWebAuthnを用いる機能は要件として含めることは可能と考えており、機会があれば前向きに考えていきたいと考えております。


# 所感

初めての勉強会登壇でしたが、アンケートでの回答やTwitterでのリアルタイム反応を見るのは新鮮で、自分にとって学びの多い勉強会になりました。反省点としては、少し時間がオーバしてしまい質疑応答ができなかったので、次回以降のイベントでは改善していければと思います。

フューチャーではFuture Tech Nightの他にも様々なイベントを開催しており、引き続き、参加者の皆さんと交流できる場としてもイベントを盛り上げていければと考えています。今後も皆様のご参加をお待ちしております。次回のイベント情報はフューチャーの[connpass](https://future.connpass.com/)で確認できます。

最後に、発表をご視聴いただいた方、当記事を最後まで読んでいただいた方、ありがとうございました。
