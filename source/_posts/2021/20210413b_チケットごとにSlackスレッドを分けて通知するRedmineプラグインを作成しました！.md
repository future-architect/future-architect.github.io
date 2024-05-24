---
title: "チケットごとにSlackスレッドを分けて通知するRedmineプラグインを作成しました！"
date: 2021/04/13 00:00:00
postid: "b"
tag:
  - Redmine
  - Slack
  - OSS
  - コアテク
category:
  - Infrastructure
thumbnail: /images/20210413b/thumbnail.png
author: 小松裕二
lede: "Futureでは約一年前にコミュニケーションツールとして採用され社内外のコミュニケーションにSlackを使うことも増えました。そしてプロジェクト管理で利用しているRedmineは相変わらず現役です。個人的にはRedmine4.2のリリースを心待ちにしています。さて、そうなるとRedmineからSlackへ通知したくなりますね。"
---

## 目次
* [はじめに](#はじめに)
* [プラグイン概要](#プラグインの概要)
* [実装のポイント](#実装のポイント)
* [インストールと設定](#インストールと設定)
* [動作確認](#動作確認)
* [おわりに](#おわりに)


## はじめに
​
こんにちは、TIGコアテクノロジーユニットの高橋・小松です。

皆さん、Slack使っていますか？
​
Futureでは約一年前にコミュニケーションツールとして採用され社内外のコミュニケーションにSlackを使うことも増えました。そしてプロジェクト管理で利用しているRedmineは相変わらず現役です。個人的にはRedmine4.2のリリースを心待ちにしています。

さて、そうなるとRedmineからSlackへ通知したくなりますね。

以前[RedmineからGoogle Hangouts Chatへ連携するプラグイン](/articles/20190620/)を紹介しましたが今回そのSlack版を作成しましたので紹介します！

### 既存redmine slackプラグインとの違い

Github上に[redmine-slack](https://github.com/sciyoshi/redmine-slack)プラグインがすでに公開されていますが、題名にもある通り今回開発したRedmine Slack IntegrationプラグインはRedmineチケットごとにSlackスレッドを分けて通知してくれます。

これによりスレッド内で過去の更新を確認でき、議論しやすくなります。またプロジェクトやユーザごとに通知を無効化できる機能もつけています。
​
Redmineでチケット起票や更新のイベントが発生した際に、自動的にSlackチャンネルにメッセージが送信されます。

### 主な機能

1. RedmineチケットごとにSlackスレッドを分けてチケットの内容/各ステータス更新を通知します。
2. プロジェクト単位で、Slack通知先チャンネルの設定ができます。
3. 見落とし防止のため、Slackチャンネル通知(Also send to)も行います。
4. 親子関係プロジェクトで、指定した子プロジェクトだけのチケット更新を通知対象外として設定できます。
5. 指定したユーザのチケット更新を通知対象外として設定できます。

## 実装のポイント

Google HangoutsとSlackではスレッドIDの管理方法が少々異なります。
Google Hangoutsは任意の値をスレッドIDとすることができるためRedmineチケットURLのハッシュ値をスレッドIDとしました。

```ruby
    # Google Hangouts通知のスレッドIDの設定部分抜粋
    thread_key = Digest::MD5.hexdigest(issue_url)
    thread_url = webhook_url + "&thread_key=" + thread_key

    # Google Hangouts通知部分抜粋
    client.post_async url, {:body => data.to_json, :header => {'Content-Type' => 'application/json'}}
```

一方SlackはスレッドIDをRedmine側から指定することができずSlack側で生成されたスレッドIDを取得する必要があります。

そのためSlackApp(インストール方法は後述)からスレッドIDの戻り値を取得しRedmineチケットのカスタムフィールドでスレッドIDを管理することにしました。

これによりチケット新規作成時はスレッドIDを取得するため同期http通信となりますがチケット更新時は非同期http通信でSlackへ連携することでパフォーマンスが落ちにくくなります。

```ruby
    # Slack通知部分抜粋
    if thread_ts.blank?
      res = client.post slack_api_url, {:body => data.to_json, :header => header}
    else
      client.post_async slack_api_url, {:body => data.to_json, :header => header}
    end

    # SlackスレッドID取得抜粋
    begin
      res_body = JSON.parse(res.http_body.content)
    rescue Exception => e
      Rails.logger.warn("Cannot parse JSON string: #{res.http_body.content}")
      Rails.logger.warn(e)
    end
    return nil if res_body.nil?
    return res_body['ts']

```
​

## インストールと設定

### 1. インストール
​
[README](https://github.com/future-architect/redmine_slack_integration/blob/master/README.md)を参照してください。

(フューチャー社内連絡)利用の際はコンシェルジュで依頼ください

### 2. Slack APP新規作成

1. 前提条件
   * Slack APP作成するユーザはSlackチャンネルに書き込みの権限が必要です。
2. Slack URLを開く
   * https://api.slack.com/apps/
3. Slack App作成
   * 画面右上の「Create New App」をクリックしてください。
   <img src="/images/20210413b/20210302_050412_MUu9IrrIbg7w.png" alt="2021-03-02_17h02_40.png" loading="lazy">
4. Slack App基本情報の入力
   * 立ち上がったポップアップへ以下情報を入力して、「Create App」をクリックして、保存してください。
   | 項目名 |値 | 説明 |
   |:-----------|:------------|:------------|
   | App Name | Slack App名 ||
   | Development Slack Workspace | 連携するSlackチャンネルのワークスペース ||

   <img src="/images/20210413b/20210311_061735_szaJQUXknPxD.png" alt="2021-03-02_17h35_28.png" loading="lazy">
5. 「OAuth & Permissions」画面を開く
    * 画面の左側メニューの「Features」->「OAuth & Permissions」をクリックしてください。
    <img src="/images/20210413b/20210311_061919_Y8ExQo1I03HK.png" alt="2021-03-02_20h17_33.png" loading="lazy">
6. Scopes追加
    * 画面の中央に「Scopes」->「Bot Token Scopes」->「Add an OAuth Scope」をクリックして、chat:write、chat:write.customize、chat:write.publicのscopeを追加してください。
    <img src="/images/20210413b/20210302_083053_jNMHi35XtJ4D.png" alt="2021-03-02_20h30_16.png" loading="lazy">
7. Bot User OAuth Token作成
    * 画面の上に「OAuth Tokens & Redirect URLs」->「Install to Workspace」をクリックしてください。
    <img src="/images/20210413b/20210302_084904_6h6zUh2LRNeE.png" alt="2021-03-02_20h39_02.png" loading="lazy">
    立ち上がったポップアップの「許可する」をクリックして、Bot User OAuth Tokenを作成します。
    <img src="/images/20210413b/20210311_062417_BXwWoDuY3G67.png" alt="2021-03-02_20h53_11.png" loading="lazy">
8. Bot User OAuth Tokenをコピー
    * 「OAuth Tokens for Your Team」-> 「Bot User OAuth Token」のトークン内容をメモしてください。（「Copy」をクリック）
    <img src="/images/20210413b/20210302_090112_KthIlVZmu6RK.png" alt="2021-03-02_20h56_42.png" loading="lazy">

​
### 3. Redmine設定​
​
#### 3-1. Redmineプロジェクト設定

1. Redmineプロジェクト管理者権限があるアカウントでログインしてください。
2. プロジェクトの「設定」-> 「情報」の画面を開いてください。
3. 「Slack Channel」にSlack通知先チャンネル名を入力してください。
4. 「Slack Token」にコピーしたトークン内容を貼り付けてください。
5. 「Slack Disabled」を「いいえ」に選択してください。
6. 「保存」をクリックして、設定内容を保存してくだくさい。

<img src="/images/20210413b/20210311_063301_O4jfcZ1FSAny.png" alt="2021-03-03_16h38_35.png" loading="lazy">

#### 3-2. 特定子プロジェクトだけ通知を無効

親子関係のRedmineプロジェクトで、子プロジェクトのSlack通知設定情報は親プロジェクトから継承できるため、親プロジェクトでの設定されたSlackチャンネルも通知できます。

一方、特定子プロジェクトだけ通知を無効にすることもできます。

1. Redmineプロジェクト管理者権限があるアカウントでログインしてください。
2. プロジェクトの「設定」-> 「情報」の画面を開いてください。
3. 「Slack Disabled」を「はい」に選択してください。
4. 「保存」をクリックして、設定内容を保存してください。

<img src="/images/20210413b/20210311_063536_RFkCB7QcO9e8.png" alt="2021-03-04_11h11_29.png" loading="lazy">

#### 3-3. 特定ユーザだけ通知を無効

特定ユーザからのチケット更新の通知を無効にしたい場合は「個人設定」の「Slack Disabled」を「はい」にしてください。

例えば、ビルドユーザで大量のREST-APIを利用するシーンなどを想定しています。

設定はビルドユーザでログインしてビルドユーザの個人設定画面で行ってください。
​
<img src="/images/20210413b/20210304_111712_yt9XAeY0BE7p.png" alt="2021-03-04_11h14_25.png" loading="lazy">


## 動作確認
​
### チケット新規起票

<img src="/images/20210413b/20210311_064251_fBozRNNlpJMZ.png" alt="2021-03-04_11h32_12.png" loading="lazy">

### チケット更新

<img src="/images/20210413b/20210311_064454_UEQgnwhbNw6p.png" alt="2021-03-04_11h48_25.png" loading="lazy">

### Slackスレッドで議論

​一例ですが、Redmineの更新を受けてSlackスレッドで議論することで対応をスムーズに進めることができます。

<img src="/images/20210413b/20210316_034609_GO1fXyegzuce.png" alt="2021-03-16_15h18_43.png" loading="lazy">


## おわりに

我々のチームではRedmine Slack IntegrationプラグインでSlackのスレッドがとても管理しやすくなりました。

Githubからダウンロード可能ですのでぜひお試しください。Pull Requestもお待ちしております。

このプラグインがスムーズなプロジェクト運営の一助になれば幸いです。

----------------------------
**TIGコアテクノロジーユニット**

TIGコアテクノロジーユニットでは、現在チームメンバーを募集しています。

私たちと一緒にテクノロジーで設計、開発、テストの高品質・高生産性を実現する仕組みづくりをしませんか？

興味がある方はお気軽に技術ブログTwitterや会社採用HPへ、連絡をお待ちしております。

https://www.future.co.jp/recruit/

​



