---
title: "Redmine Slack Integration Pluginにメンション機能を追加しました！"
date: 2021/09/27 00:00:00
postid: a
tag:
  - Redmine
  - Slack
  - OSS
  - コアテク
category:
  - Infrastructure
thumbnail: /images/20210927a/thumbnail.png
author: 高橋健
lede: "こんにちは、TIGコアテクノロジーユニットの高橋・小松です。Gitlabのマークはきつねではなくたぬきだったんですね...。今回はRedmine Slack Integration Pluginにメンション機能を追加したので紹介させていただきます。"
---
## はじめに

こんにちは、TIGコアテクノロジーユニットの高橋・小松です。

Gitlabのマークはきつねではなくたぬきだったんですね...。

前回[RedmineとGitLabの連携プラグインを開発しました！](/articles/20210908a/)の記事を書きましたが、広報担当がきつね絵文字を添えてTwitter投稿したところ社員から正しくはたぬきだと指摘がありました。まさかと思い調べましたが本当に[そう](https://www.publickey1.jp/blog/20/gitlab.html)でした。今年の秋で一番の衝撃を受けるとともに一部誤った投稿であったことをこの場を借りてお詫びいたします。

さて、今回は以前こちらの記事で紹介したRedmine Slack Integration Pluginにメンション機能を追加したので紹介させていただきます。

* [チケットごとにSlackスレッドを分けて通知するRedmineプラグインを作成しました！](/articles/20210413b/)


## 実装のポイント

メンションをつけるにはSlackのIDを取得する必要があります。

* https://api.slack.com/changelog/2017-09-the-one-about-usernames

上記を参考にしたところ以下のいずれかが必要となるようです。
- メンバーID
    - Slackのシステム側でユーザーを一意に識別するためのID
- Display name
    - Slack利用時に表示され、登録は任意
- User name
    - 弊社環境ではメールアドレスの@より前のアカウント部分が設定されていました

これをRedmineから指定するためにユーザカスタムフィールドにSlack User IDを追加しました。

利便性を考慮しSlack User IDを設定せずともある程度自動で設定されるようにしています。Redmineに登録されているメールアドレスを元にSlack APIで検索をかけて見つかればメンバーIDを設定し、見つかれなければメールアドレスのアカウント部分を設定するという動きです。

なお、SlackAppにはメールアドレス検索のために下記権限をを追加する必要があります。
1. `users:read`
2. `users:read.email`

もしSlackに登録しているメールアドレスがRedmineに登録しているものと異なる場合はSlack User IDを適宜手動で設定するようにしてください。

<img src="/images/20210927a/メールアドレス設定.png" alt="メールアドレス設定.png" width="753" height="564" loading="lazy">

## 動作確認

以下のような動作になっています。

* チケットを作成・更新した際に、担当者/ウォッチャー宛にメンションがつきます。
* 担当者を変更した際、新しい担当者/ウォッチャー宛にメンションがつきます。

実際にメンションがついたSlack画面の例はこちらです。

<img src="/images/20210927a/メンションがついたSlackのコメント.png" alt="メンションがついたSlackのコメント.png" width="994" height="595" loading="lazy">


## おわりに

今回の機能追加でチケットの更新を放置することが減りわざわざ担当者変更後に個別にメンションをつけるといったことも必要も無くなり効率が良くなりました。

社内でも好評利用中です。

[GitHub](https://github.com/future-architect/redmine_slack_integration/)からダウンロード可能ですのでぜひお試しください。Pull Requestもお待ちしております。

----------------------------
**TIGコアテクノロジーユニット**

TIGコアテクノロジーユニットでは、現在チームメンバーを募集しています。私たちと一緒にテクノロジーで設計、開発、テストの高品質・高生産性を実現する仕組みづくりをしませんか？

興味がある方はお気軽に技術ブログTwitterや会社採用HPへ、連絡をお待ちしております。

* https://www.future.co.jp/recruit/

