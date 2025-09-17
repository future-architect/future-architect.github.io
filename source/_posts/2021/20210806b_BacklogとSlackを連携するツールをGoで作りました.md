---
title: "BacklogとSlackを連携するツールをGoで作りました"
date: 2021/08/06 00:00:01
postid: b
tag:
  - Go
  - OSS
  - Slack
category:
  - Management
thumbnail: /images/2021/20210806b/thumbnail.png
author: 伊藤真彦
lede: "私のチームではタスク管理でバックログを使っています。タスクのカテゴリ、マイルストーンやそれらを組み合わせた検索機能が充実している事や、タスクを入力するとバーンダウンチャートが自動で出来上がるところなど素晴らしいツールだと思っています。チケット消化に貢献すると褒めてくれるのも良いですね。"
---

TIGの伊藤真彦です。

私のチームではタスク管理でバックログを使っています。

タスクのカテゴリ、マイルストーンやそれらを組み合わせた検索機能が充実している事や、タスクを入力するとバーンダウンチャートが自動で出来上がるところなど素晴らしいツールだと思っています。

チケット消化に貢献すると褒めてくれるのも良いですね。
<img src="/images/2021/20210806b/image.png" alt="Backlogのチャート" width="1200" height="558" loading="lazy">

さてチケット管理を行うとチケットを監視する仕事が産まれますが、それをある程度自動化するためのツールを作成しました。

# backlogslackify

リポジトリはこちらです。

https://github.com/future-architect/backlogslackify

未完了のBacklogチケットの存在をSlackに通知するツールです。

Slackと連携するものをslackifyと呼ぶのはRuby on Rails開発者時代にお世話になった[capistrano-slackify](https://github.com/onthebeach/capistrano-slackify)を真似ています。

READMEに記載していますが、未完了のBacklogチケットのURL、リンク、担当者を画像のようにSlackに投稿してくれます。

<img src="/images/2021/20210806b/image_2.png" alt="ツールイメージ" width="946" height="322" loading="lazy">

GoでBacklogチケットを取り扱うロジックは[公式ドキュメント](https://developer.nulab.com/ja/docs/backlog/libraries/#)にも紹介されている事から、[kenzo0107さんのライブラリ](https://github.com/kenzo0107/backlog)を安心して利用でき、仕事の片手間にササっと作ることができました、ありがとうございます。

# 設定方法

詳細な使用方法はREADMEに記載されていますので、補足資料として必要な情報を記載します。

### Configについて

```go main.go
// ClientOption is input options to build client
// BacklogDueDate is "weekend" or "end_of_month" or relative days number like "3"
// required parameter is below
// BacklogApiKey
// BacklogBaseUrl
// SlackWebhookUrl
// SlackChannel
// SearchConditions
type ClientOption struct {
	BacklogApiKey    string            `json:"backlog_api_key"`
	BacklogBaseUrl   string            `json:"backlog_base_url"`
	BacklogDueDate   string            `json:"backlog_due_date"`
	SlackWebhookUrl  string            `json:"slack_webhool_url"`
	SlackChannel     string            `json:"slack_channel"`
	SlackAccountName string            `json:"slack_account_name"`
	SlackIconEmoji   string            `json:"slack_icon_emoji"`
	SlackIconUrl     string            `json:"slack_icon_url"`
	IsSinglePost     bool              `json:"is_single_post"`
	DryRun           bool              `json:"dry_run"`
	SearchConditions []SearchCondition `json:"search_conditions"`
}

// SearchCondition is conditions to search backlog ticket
// it depends on github.com/kenzo0107/backlog
type SearchCondition struct {
	Name      string                    `json:"name"`
	Condition *backlog.GetIssuesOptions `json:"condition"`
}
```

コードに書いている通りですが、BacklogのAPIを実行するための各種設定、Slackに投稿するための各種設定、検索するチケットの設定を行います。チケットの検索条件にヒットしたもののうち、期限日が`BacklogDueDate`で設定した日数、または`weekend`にした場合週末を超過した場合、そのチケットが通知対象に追加されます。

きちんと期限日を設定しないとどれだけ放置されても検知できませんのでご注意ください。設定の内容を整備したら、適宜手動で実行するか、任意のアーキテクチャで定時バッチとして実行する使い方を想定しています。

### BacklogのAPIキーの取得方法

[公式のリファレンス](https://support-ja.backlog.com/hc/ja/articles/360035641754-API%E3%81%AE%E8%A8%AD%E5%AE%9A)を参照してください

### Slackの連携URL

Slackとの連携にはIncoming Webhooksを利用しています。公式ドキュメントは[こちら](https://api.slack.com/messaging/webhooks)です。

### チケットの検索条件について

Backlogの課題取得APIを実行しています。

APIリファレンスは[こちら](https://developer.nulab.com/ja/docs/backlog/api/2/get-issue-list/#)です。
`ProjectIDs`、`CategoryIDs`あたりがあれば実用充分だとは思いますが、APIで使えるものは何でも絞り込みに利用できます。絞り込みたい`CategoryIDs`を知りたい場合は、実際にBacklogでチケットを検索するとブラウザのアドレスバーに表示されています。

## 実際に使ってみての感想

毎朝9時にbotを動かすようにしました。

Slackに投稿されると何が嬉しいかというと、画像のようなノリで楽に終わってないチケットにツッコミを入れることができます。

<img src="/images/2021/20210806b/image_3.png" alt="" width="759" height="585" loading="">

未完了のチケットを調べて、誰の担当になっているかを確認して、適宜終わっているか確認するのは単純に手間がかかるだけでなく、急かしているような印象を与えないための配慮など、人対人のコミュニケーションには時間とスタミナを奪われがちです。

こういったものはなるべく自動化していきたいですね。

OSSにしたことでどこかで利用いただければ嬉しいです。
