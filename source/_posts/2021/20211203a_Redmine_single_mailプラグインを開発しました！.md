---
title: "Redmine_single_mailプラグインを開発しました！"
date: 2021/12/03 00:00:00
postid: a
tag:
  - コアテク
  - OSS
  - Redmine
category:
  - Infrastructure
thumbnail: /images/20211203a/thumbnail.png
author: 高橋健
lede: "Redmine4系からメール送信仕様が変わっていることが判明しました。そこで3系と同等のメール送信方式となるようなRedmine_single_mailプラグインを開発しましたので紹介させていただきます。"
---
## 目次
* [はじめに](#はじめに)
* [主な仕様](#主な仕様)
* [インストールと設定](#インストールと設定)
* [実装のポイント](#実装のポイント)
* [おわりに](#おわりに)

## はじめに

こんにちは、TIGコアテクノロジーユニットの高橋・小松です。

最近はRedmine3系から4系へのバージョンアップ検証を進めています。
その中でRedmine4系からメール送信仕様が変わっていることが判明しました。

| バージョン                   | メール送信仕様 |
|------------------------|-------------|
|Redmine3系|チケット作成/更新時に**全ての関係者を宛先にした単一メールを送信**|
|Redmine4系|チケット作成/更新時に**全ての関係者「ごと」にそれぞれメールを送信**|


4系の仕様はセキュリティに配慮してのことかと考えられますが弊社環境では以下のような問題が懸念されます。

* 特定アカウントのメールアドレスにメーリングリストを設定することでメール数を減らしている場合、メーリングリストと個人宛のメールを2重に受け取ることになってしまう
* メールが今までよりも多く送信されることになりメールサーバへの負荷が増大する
* [Gmailの送受信上限](https://support.google.com/a/topic/28609?hl=ja&ref_topic=9202)に達しやすくなる

そこで3系と同等のメール送信方式となるような[Redmine_single_mailプラグイン](https://github.com/future-architect/redmine_single_mail)を開発しましたので紹介させていただきます。

https://github.com/future-architect/redmine_single_mail

なお、以下のチケットでも話し合いが行われており参考にさせていただきました。
https://redmine.tokyo/issues/1083

## 主な仕様

メールサーバへの負荷が懸念されることからユーザごとの設定ではなくRedmine全体で宛先をまとめて設定した単一メールが送信されるようにしました。

チケットの作成/更新時は3系同様ウォッチャーにもccでメールを送信するようにしています。


## インストールと設定

インストール方法については特殊な部分はありませんのでプラグインのReadmeを参照ください。

プラグインのインストール後に設定画面で以下のようにチェックを入れることで設定できます。

<img src="/images/20211203a/インストール設定画面.png" alt="インストール設定画面.png" width="633" height="288" loading="lazy">


## 実装のポイント

Redmine4系のメール通知送信処理では、クラスメソッドdeliver_XXX(機能)_YYY(操作)とインスタンスメソッドXXX(機能)_YYY(操作)のセットでメール通知を行っています。

例えば、チケット作成のメール通知処理は、クラスメソッドdeliver_issue_addとインスタンスメソッドissue_addで構成されています。

クラスメソッドdeliver_issue_addは、メール通知対象ユーザの分だけループする役割を担当しています。そしてインスタンスメソッドissue_addは、実際のメール作成とメール送信の役割を担当しています。

```php Redmineソースからの抜粋
# Notifies users about a new issue.
def self.deliver_issue_add(issue)
    users = issue.notified_users | issue.notified_watchers
    users.each do |user|
        issue_add(user, issue).deliver_later
    end
end

# Builds a mail for notifying user about a new issue
def issue_add(user, issue)
    redmine_headers 'Project' => issue.project.identifier,
                    'Issue-Tracker' => issue.tracker.name,
                    'Issue-Id' => issue.id,
                    'Issue-Author' => issue.author.login
    redmine_headers 'Issue-Assignee' => issue.assigned_to.login if issue.assigned_to
    message_id issue
    references issue
    @author = issue.author
    @issue = issue
    @user = user
    @issue_url = url_for(:controller => 'issues', :action => 'show', :id => issue)
    subject = "[#{issue.project.name} - #{issue.tracker.name} ##{issue.id}]"
    subject += " (#{issue.status.name})" if Setting.show_status_changes_in_mail_subject?
    subject += " #{issue.subject}"
    mail :to => user,
    :subject => subject
end
```

一方Redmine_single_mailプラグインでは、クラスメソッドdeliver_issue_addで通知対象ユーザをループせずに、直接メール送信メソッドissue_addに処理させます。
そしてインスタンスメソッドissue_addで、toの関連ユーザとccのウォッチャーユーザをそれぞれ設定し、単一メールで送信を行います。

```php Redmine_single_mailプラグインソースの抜粋
# Notifies users about a new issue.
def deliver_issue_add(issue)
    if !!Setting.plugin_redmine_single_mail[:single_mail]
        issue_add(User.current, issue).deliver_later
    else
        super(issue)
    end
end

# Builds a mail for notifying user about a new issue
def issue_add(user, issue)
    msg = super(user, issue)
    if !!Setting.plugin_redmine_single_mail[:single_mail]
        to_users = issue.notified_users
        cc_users = issue.notified_watchers - issue.notified_users
        mail :to => to_users, :cc => cc_users, :subject => msg.subject
    else
        msg
    end
end
```

例えばチケットの更新、ニュースの追加、Wikiページの追加等の操作も上記であげたチケット作成と同様の実装で対応できます。

## おわりに

Redmineのバージョンアップによるメール送信仕様変更は日本の企業ユースでは中々許容しにくいものに感じました。

もし似たようなお悩みを抱えている方がいらっしゃいましたら[Github](https://github.com/future-architect/redmine_single_mail)からダウンロード可能ですのでぜひお試しください。Pull Requestもお待ちしております。

今回開発したプラグインがどなたかのお役に立てば幸いです。

----------------------------
**TIGコアテクノロジーユニット**

TIGコアテクノロジーユニットでは、現在チームメンバーを募集しています。私たちと一緒にテクノロジーで設計、開発、テストの高品質・高生産性を実現する仕組みづくりをしませんか？

興味がある方はお気軽に技術ブログTwitterや会社採用HPへ、連絡をお待ちしております。
https://www.future.co.jp/recruit/

