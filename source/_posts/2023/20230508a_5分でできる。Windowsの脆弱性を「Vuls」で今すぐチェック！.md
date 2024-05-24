---
title: "5分でできる。Windowsの脆弱性を「Vuls」で今すぐチェック！"
date: 2023/05/08 00:00:00
postid: a
tag:
  - Security
  - OSS
  - Vuls
category:
  - Security
thumbnail: /images/20230508a/vuls.png
author: 島ノ江励
lede: "弊チームがOSSとして公開しメンテナンスしている「Vuls」の新機能についてご紹介させていただきたいと思います。皆さんは、自社が保有するサーバやソフトウェアに脆弱性がないかどうか、どのようにチェックしていますか？"
---

## はじめに

こんにちは。ペンギンになりたい見習いエンジニア、島ノ江です。

現在は[FutureVuls](https://vuls.biz/)という脆弱性管理クラウドサービスで、開発とサポートなどを担当しています。

未だよちよち歩きの新米ですが、今回は弊チームがOSSとして公開しメンテナンスしている「Vuls」の新機能についてご紹介させていただきたいと思います。

### 脆弱性とその検知

皆さんは、自社が保有するサーバやソフトウェアに脆弱性がないかどうか、どのようにチェックしていますか？脆弱性を放置したまま運用すると、サイバー攻撃により企業に大きな損害をもたらす恐れがあるため、対策を講じることが不可欠です。

しかし、人間が情報収集から影響調査までを手動で行う脆弱性対応には、膨大な作業量と苦痛と絶望感が伴います。

そこで我々が提供するVulsが登場します。

[Vuls](https://github.com/future-architect/vuls)は、各種OVALやSecurityTrackerなどの情報、NVDやJVNなどの公開されている脆弱性情報をデータベース化し、サーバやソフトウェアの脆弱性を自動検知するツールです。

また、商用版の継続的脆弱性管理クラウドサービスである[FutureVuls](https://vuls.biz/)では、検知した脆弱性の自動リスク判定やチケット機能による差分管理機能などを提供しており、脆弱性管理の一連の作業を自動化できます。

1万 GitHub Star目前！

<img src="/images/20230508a/vuls.png" alt="" loading="lazy">

そんな便利ツールのVulsですが、これまではWindowsはサポートしていませんでした。

米国の行政機関CISA(Cybersecurity & Infrastructure Security Agency)の[報告](https://www.cisa.gov/news-events/cybersecurity-advisories/aa22-117a)によると、2021年に頻繁にサイバー攻撃に利用された注意すべき脆弱性上位 15位のなかでWindowsのものは半数を超えています。 そして、Windowsのアップデートや脆弱性の管理は特に重点的に行う必要があるものの、継続的にメンテナンスされているOSSのWindows用脆弱性スキャナはごく少数なのが現状です。

「クッ、やはりWindowsの脆弱性検知は商用版を買うしかないのか...これがOSSの限界か...」と悩んでいたそんなあなたに朗報です！

これまでクラウドサービス版向けに提供されていた、Windowsスキャン機能が移植され、OSSのVulsでもWindowsをスキャンできるようになりました。

参考）[継続的脆弱性管理サービス「FutureVuls」Windowsのための脆弱性スキャナをOSS化](https://prtimes.jp/main/html/rd/p/000000623.000004374.html)

この新機能を紹介するため、今回の記事ではWindowsサーバのスキャンを試していきます！

## WindowsサーバでVulsの脆弱性スキャンを試す

実際にWindowsサーバにVulsの実行環境を作成して、サーバスキャンをやってみようと思います。

今回は筆者の自宅にあったWindows Server 2012を対象としています。

実行手順は以下の通りです：

1. スキャンをするvuls、脆弱性データベースを作成するgostの実行ファイルをそれぞれ取得する。
2. gostを実行して、Windowsで検知するためのDBを作成する
3. `vuls.exe scan`, `vuls.exe report`により検知を実行、結果を確認する。

たったのこれだけで脆弱性の検知ができます、簡単ですね！
以下で実際の作業手順を見ていきます。

### 実行ファイルの取得

GitHubレポジトリから自分の環境に併せて実行ファイルをダウンロードします。

* vuls：[こちら](https://github.com/future-architect/vuls/releases)から最新バージョンのvuls実行ファイルを選択
* gost：[こちら](https://github.com/vulsio/gost/releases)から最新バージョンのgost実行ファイルを選択

### 検知用の脆弱性データベースの作成

次にWindowsで検知するためのデータベースをローカルに作成します。

```Shell
gost.exe fetch microsoft
```

その後、スキャン用の設定ファイル（config.toml）を作成して、ここで作成したデータベースへのパスを定義します。（以下のsqlite3Pathの部分を各自の環境に併せてください）

```ini
# config.toml の内容
[gost]
type = "sqlite3"
sqlite3Path =  "C:\\Users\\User\\vuls\\gost.sqlite3"  # ここを編集
[servers]
[servers.localhost]
host = "localhost"
port = "local"
```

### スキャンとレポートを実行する

以上でWindowsスキャンの準備が完了したので、スキャンを実行します。

```Shell
vuls.exe scan
```

最終的なスキャン結果が表示されます。

検出した脆弱性の一覧を表示してみましょう。

```Shell
vuls.exe report
```

<img src="/images/20230508a/vuls_report.png" alt="" loading="lazy">

自分のサーバで見つかった脆弱性と、それらのCVSSスコアなどが表形式で表示されました。

WindowsのアップデートはKBという単位で提供されていますが、インターネットの情報ではKBとCVSSスコアなどを関連付けるのが手間でした。Vulsを使うと、未適用なKBに含まれる脆弱性をCVEに展開してくれて、さらにそのCVSSを表示してくれるので対応有無を判断しやすくなります。

なお、評価が0.0や？になっているものは、CVSSスコアが設定されていないものです。

通常の煩雑な脆弱性検知のプロセスを、簡単な導入手順で自動化することができるのは楽ですね！最終的な出力結果も表形式になっていてとても見やすいです。

## まとめ：脆弱性スキャナといえばVulsでしょ

Vulsのスキャナは、どなたでも無償で利用できるオープンソースのツールです。

今回はWindowsスキャンについて紹介しましたが、Vulsは様々なOSに対応しています。脆弱性検知のツールの１つとして是非ご活用ください。

ただし、脆弱性は見つけるだけでは意味がありません。リスクに応じて適切に対応するまでが脆弱性対応です。クラウド版の[FutureVuls](https://vuls.biz/)では、Vulsで検知した脆弱性の対応優先度の自動判断から解消までのサポートを提供しています。

以上でOSSのVulsで行うWindowsスキャンの紹介を終えたいと思います。

良ければいいね・ツイートなどで共有をお願いします！
