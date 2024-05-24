---
title: "RedmineとGitLabの連携プラグインを開発しました！"
date: 2021/09/08 00:00:00
postid: a
tag:
  - Redmine
  - OSS
  - GitLab
  - コアテク
category:
  - Programming
thumbnail: /images/20210908a/thumbnail.png
author: 高橋健
lede: "RedmineとGitLabリポジトリを連携するRedmine GitLab Adapter Pluginを開発しましたので紹介させていただきます。"
---

## はじめに
​
こんにちは、TIGコアテクノロジーユニットの高橋・小松です。

RedmineとGitLabリポジトリを連携する[Redmine GitLab Adapter Plugin](https://github.com/future-architect/redmine_gitlab_adapter)を開発しましたので紹介させていただきます。

もともとRedmineにはGitリポジトリを登録する機能があります。この機能でRedmineのチケットに修正内容を紐づけて管理したり、特定のコメントを付けることでRedmineチケットのステータスを変更する、というようなことが可能です。

* [バージョン管理システムとの連携 — Redmine.JP](https://redmine.jp/tech_note/subversion/)

便利な機能ではあるのですが構成上の課題やGitLabのバージョンアップに伴う問題点が出てきたため、GitLab APIを用いた形でGitLabリポジトリ連携用のアダプタを作りました。


## 構成上の課題

Gitリポジトリ登録機能ですが、Redmineサーバ上で直接Gitリポジトリを読み取ることができないといけません。大きく以下の2つの方式が採られることが多いようです。

①bareリポジトリをRedmineサーバ上にコピーし、定期的にリポジトリの更新を反映させる

<img src="/images/20210908a/1.png" alt="1.png" width="507" height="320" loading="lazy">


②リポジトリサーバをNFSマウントしRedmineサーバ上から直接参照できるようにする

<img src="/images/20210908a/2.png" alt="2.png" width="514" height="326" loading="lazy">


当社では主にNFS方式で直接参照させるような構成を取っていました。

NFSマウントがあるというだけでサーバの起動順番を意識しないといけないですし障害ポイントにもなりやすいです。また[最近のGitLabのバージョンアップでストレージパスがハッシュ値に変更](https://gitlab-docs.creationline.com/ce/administration/repository_storage_types.html#hashed-storage)され、GitLabサーバ管理者でないと登録困難な状況になってしまいました。​

<img src="/images/20210908a/ハッシュ値.png" alt="ハッシュ値.png" width="753" height="138" loading="lazy">


## プラグインの特徴
今回開発したプラグインはGitLabのAPI経由でリポジトリ情報を取得するためNFSマウントやリポジトリコピーを行う必要がありません。
<img src="/images/20210908a/3.png" alt="3.png" width="483" height="322" loading="lazy">

通常アクセスするGitLabのURLを登録することで連携できるようになっており、リポジトリのハッシュ値を取得して登録する必要もありません。

<img src="/images/20210908a/4.png" alt="4.png" width="1040" height="400" loading="lazy">


httpプロキシを経由する場合やコンテキストルートを独自に設定してある構成でも対応できるようにしています。

従来同様リポジトリタブへのアクセスもしくはfetch_changesetsコマンドを実行することで、Gitリポジトリの更新をRedmineDB(変更履歴情報を持つchangesetsテーブル群)に取り込むことができます。


## 実装のポイント

従来方式ではgit logコマンドで指定した開始リビジョン番号と終了リビジョン番号の間のコメントだけを一括取得できます。一方GitLab APIではリビジョン番号の指定ではなく、指定日時の期間で取得することができます。また一回のAPI実行で最大100個のコミット情報しか取得できません。

よって最初の取り込みでは、一番古いコミット情報から一定数をchangesetsへ取り込み、取り込んだ分のコミット最終時刻をrepositoriesテーブルのextra_infoに記録しておきます。その後fetch_changesetsコマンドが実行される度に記録されたコミット時刻を参照し、その時刻からのコミット情報を500件ごとにchangesetsテーブルに取り込む動作になっています。

なお、色々と試した上でタイムアウトしない値として500件にしています。


## インストールと設定

### 1. 動作条件

本プラグインは以下の条件で動作確認しています。

* Redmine 3系 , 4系
* Ruby 2.4 ～ 2.6
* GitLab 13系 (GitLab API v4)

下記のGemライブラリを使用しています。

* GitLab v4.14.0
* no_proxy_fix v0.1.2

### 2. インストール

1. 本プラグインのディレクトリredmine_gitlab_adapterを$REDMINE_ROOT/pluginsディレクトリの直下にコピーしてください。
2. $REDMINE_ROOTディレクトリで下記のコマンドを実行して、gitlabとno_proxy_fixのGemライブラリをイントールしてください。
　例) bundle install
3. redmineを再起動してください。


### 3. GitLab APIアクセストークンの取得

1. GitLabにログインしてください。
2. 「User Settings」-> 「Access Tokens」の画面を開いてください。
3.  以下の内容を設定して「Create personal access token」ボダンをクリックし、アクセストークンを発行してください。

| 項目                  | 値 |
|------------------------|-------------|
|名前|任意の値|
|有効期限日|設定しない|
|read_api|チェック|


### 4. GitLabアダプタの有効化
1. Redmine管理者でログインしてください。
2. トップメニューの「管理」-> 「設定」->「リポジトリ」の画面を開いてください。
3. 「使用するバージョン管理システム」の「GitLab」をチェックして、保存してください。

### 5. リポジトリ設定方法
1. Redmineプロジェクト管理者でログインしてください。
2. 対象プロジェクトの「設定」->「リポジトリ」-> 「新しいリポジトリ」の画面を開いてください。
3. 「バージョン管理システム」プルダウンメニューから「GitLab」を選択してください。
4. 「URL」にgit clone対象のGitLabリポジトリURLを入力してください。
5. 「API Token」に先ほど取得したGitLab APIアクセストークンを入力してください。
6. GitLabのURLにコンテキストパスが含まれている場合は、「Root URL」にコンテキストパスまでを含めたURLを入力してください。
7. 「作成」をクリックして、保存してください。

### 6. Redmineからプロキシ経由でGitLabにアクセスする場合

本プラグインはOS上の環境変数を利用しているため、環境変数http_proxy、https_proxy、no_proxyを適切に設定することでプロキシを経由する外部GitLabリポジトリを登録することが可能です。

### 7. リバースプロキシ背後にGitLabがある場合

* 対応1) リバースプロキシ設定変更
リバースプロキシでURLがエンコードされることがあり、下記のように設定変更が必要な場合があります。
リバースプロキシがApacheの場合の例を記載します。

```
AllowEncodedSlashes NoDecode
ProxyPass /gitlab http://gitlab.local:80/gitlab nocanon
```

* 対応2) GitLab Project ID使用
GitLabのURLにコンテキストパスが含まれている場合は
「URL」の入力で`https://<gitlab.url>/<context_path>/<group>/<project>.git`という形の代わりに、
`https://<gitlab.url>/<context_path>/<gitlab_project_id>`という形を使用してください。

### 8. 補足

本プラグインでRedmineへ新規にGitLabリポジトリを登録するとデータのロードが完了するまでは画面表示に時間がかかることがあります。リポジトリ画面へのアクセス、もしくはfetch_changesetsの実行により500件ごとにRedmineDBへロードされます。従来でも必要ですが同様にcron等でfetch_changesetsを定期実行するようにしてください。
​


## 動作確認

Redmineのリポジトリタブを選択して以下のような画面が表示されれば正常に登録されています。画面上の見た目は従来と同様になっています。

<img src="/images/20210908a/5.png" alt="5.png" width="1040" height="561" loading="lazy">


## おわりに

このプラグインによって長年の課題であったNFSマウントを一つ減らすことができました。

[Github](https://github.com/future-architect/redmine_gitlab_adapter)からダウンロード可能ですのでぜひお試しください。Pull Requestもお待ちしております。

----------------------------
**TIGコアテクノロジーユニット**

TIGコアテクノロジーユニットでは、現在チームメンバーを募集しています。

私たちと一緒にテクノロジーで設計、開発、テストの高品質・高生産性を実現する仕組みづくりをしませんか？

興味がある方はお気軽に[技術ブログTwitter](https://twitter.com/future_techblog)や会社採用HPへ、連絡をお待ちしております。

* https://www.future.co.jp/recruit/

